import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, TIR_ABI, RR_ABI } from './constants';
import { decodeJwtPayload, extractAddressFromDid, buildVpSigningMessage } from './jwtUtils';

export interface VpProof {
  type: string;
  challenge: string;
  verificationMethod: string;
  proofValue: string;
  credentialId: string;
  credentialSalt: string;
}

export interface VerifiablePresentation {
  holder: string;
  verifiableCredential: string[];
  proof: VpProof;
}

export type CheckStatus = 'pending' | 'pass' | 'fail';

export interface CheckResult {
  id: number;
  label: string;
  description: string;
  status: CheckStatus;
  detail: string;
}

export interface VerificationResult {
  checks: CheckResult[];
  passed: boolean;
  holderAddress: string;
  nationality: string;
  subjectDid: string;
  issuerDid: string;
  credentialId: string;
  expirationDate: string;
  error?: string;
}

function makeChecks(): CheckResult[] {
  return [
    { id: 1, label: 'Holder signature',    description: 'MetaMask signature proves presenter controls the holder wallet', status: 'pending', detail: '' },
    { id: 2, label: 'Holder ↔ Subject',    description: 'Wallet address matches the subject DID embedded in the VC',      status: 'pending', detail: '' },
    { id: 3, label: 'Trusted issuer',      description: 'Issuer address is registered in TrustedIssuerRegistry on-chain', status: 'pending', detail: '' },
    { id: 4, label: 'Credential active',   description: 'Credential is anchored on-chain and has not been revoked',       status: 'pending', detail: '' },
  ];
}

/** Recomputes credentialHash — must match the Solidity keccak256(abi.encodePacked(string, bytes32)) */
function computeCredentialHash(credentialId: string, salt: string): string {
  return ethers.solidityPackedKeccak256(['string', 'bytes32'], [credentialId, salt]);
}

/**
 * Runs all 4 checks against a Verifiable Presentation.
 * Calls onProgress(checks) after each check so the UI can update in real time.
 */
export async function verifyPresentation(
  vp: VerifiablePresentation,
  expectedChallenge: string,
  onProgress: (checks: CheckResult[]) => void,
): Promise<VerificationResult> {
  const checks = makeChecks();
  const rpcUrl = import.meta.env.VITE_ALCHEMY_AMOY_URL as string;

  if (!rpcUrl) throw new Error('VITE_ALCHEMY_AMOY_URL is not set in .env');

  let holderAddress  = '';
  let nationality    = '';
  let subjectDid     = '';
  let issuerDid      = '';
  let credentialId   = '';
  let expirationDate = '';

  const setCheck = (id: number, status: CheckStatus, detail: string) => {
    checks[id - 1] = { ...checks[id - 1], status, detail };
    onProgress([...checks]);
  };

  try {
    // ── Pre-flight: parse VP ──────────────────────────────────────────────
    const { holder, verifiableCredential, proof } = vp;
    if (!holder || !verifiableCredential?.length || !proof?.proofValue) {
      throw new Error('VP is missing required fields (holder, verifiableCredential, proof)');
    }

    holderAddress = extractAddressFromDid(holder);
    credentialId  = proof.credentialId;

    // Decode the VC JWT payload
    const vcPayload = decodeJwtPayload(verifiableCredential[0]);
    const vc = vcPayload.vc as {
      credentialSubject?: { id?: string; nationality?: string };
      expirationDate?: string;
    };
    subjectDid     = vc.credentialSubject?.id ?? (vcPayload.sub as string) ?? '';
    issuerDid      = (vcPayload.iss as string) ?? '';
    nationality    = vc.credentialSubject?.nationality ?? '';
    expirationDate = vc.expirationDate ?? new Date(((vcPayload.exp as number) ?? 0) * 1000).toISOString();

    // Check credential hasn't expired
    if (new Date(expirationDate) < new Date()) {
      throw new Error('Credential has expired');
    }

    // ── Check 1: MetaMask holder signature ────────────────────────────────
    const signingMessage = buildVpSigningMessage({ holderDid: holder, credentialId, challenge: proof.challenge });
    const recovered = ethers.verifyMessage(signingMessage, proof.proofValue);

    if (recovered.toLowerCase() !== holderAddress.toLowerCase()) {
      setCheck(1, 'fail', `Recovered ${recovered} but expected ${holderAddress}`);
      throw new Error('Holder signature invalid');
    }
    setCheck(1, 'pass', `Signer: ${holderAddress}`);

    // Validate the challenge matches what this verifier session issued
    if (expectedChallenge && proof.challenge !== expectedChallenge) {
      setCheck(1, 'fail', `Challenge mismatch — possible replay attack`);
      throw new Error('Challenge mismatch');
    }

    // ── Check 2: Holder address matches subject DID in VC ─────────────────
    const subjectAddress = extractAddressFromDid(subjectDid);
    if (subjectAddress.toLowerCase() !== holderAddress.toLowerCase()) {
      setCheck(2, 'fail', `Holder ${holderAddress} ≠ Subject ${subjectAddress}`);
      throw new Error('Holder does not match credential subject');
    }
    setCheck(2, 'pass', `${holderAddress} = subject DID`);

    // ── Check 3: Issuer trusted on-chain ──────────────────────────────────
    const provider    = new ethers.JsonRpcProvider(rpcUrl);
    const issuerAddr  = extractAddressFromDid(issuerDid);
    const tir         = new ethers.Contract(CONTRACT_ADDRESSES.TrustedIssuerRegistry, TIR_ABI, provider);
    const trusted: boolean = await tir.isTrusted(issuerAddr);

    if (!trusted) {
      setCheck(3, 'fail', `${issuerAddr} is not in TrustedIssuerRegistry`);
      throw new Error('Issuer is not trusted');
    }
    setCheck(3, 'pass', `Issuer ${issuerAddr} is trusted`);

    // ── Check 4: Anchored and not revoked ─────────────────────────────────
    const credentialHash = computeCredentialHash(credentialId, proof.credentialSalt);
    const rr = new ethers.Contract(CONTRACT_ADDRESSES.RevocationRegistry, RR_ABI, provider);
    const [isAnchored, isRevoked]: [boolean, boolean] = await rr.getCredentialStatus(credentialHash);

    if (!isAnchored) {
      setCheck(4, 'fail', 'Credential hash not found on-chain');
      throw new Error('Credential is not anchored');
    }
    if (isRevoked) {
      setCheck(4, 'fail', 'Credential has been revoked on-chain');
      throw new Error('Credential has been revoked');
    }
    setCheck(4, 'pass', `Hash ${credentialHash.slice(0, 18)}… anchored ✓`);

  } catch (err: unknown) {
    // Mark any still-pending checks as failed context
    checks.forEach((c, i) => {
      if (c.status === 'pending') checks[i] = { ...c, status: 'fail', detail: 'Aborted after earlier failure' };
    });
    onProgress([...checks]);

    return {
      checks,
      passed: false,
      holderAddress,
      nationality,
      subjectDid,
      issuerDid,
      credentialId,
      expirationDate,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }

  return {
    checks,
    passed: true,
    holderAddress,
    nationality,
    subjectDid,
    issuerDid,
    credentialId,
    expirationDate,
  };
}
