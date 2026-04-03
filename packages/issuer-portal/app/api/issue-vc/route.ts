import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import {
  generateCredentialSalt,
  computeCredentialHash,
  createIssuerAgent,
  contractAddresses,
  RevocationRegistry__factory,
} from 'shared';

// Run in Node.js runtime (not Edge) — required for ethers + Veramo
export const runtime = 'nodejs';

// ── Mock KYC engine ────────────────────────────────────────────────────────────
// Simulates an Onfido / Jumio approval. In production, replace with a real
// API call to a licensed KYC provider.
function runMockKycCheck(data: {
  fullName: string;
  nationality: string;
  dob: string;
  documentNumber: string;
}): { approved: boolean; reason?: string } {
  if (!data.fullName || !data.nationality || !data.dob || !data.documentNumber) {
    return { approved: false, reason: 'Incomplete submission' };
  }
  // All submissions pass in the POC mock
  return { approved: true };
}

// ── POST /api/issue-vc ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fullName, nationality, dob, documentNumber, subjectAddress } = body;

    // ── 1. Validate subject address ──────────────────────────────────────────
    if (!subjectAddress || !ethers.isAddress(subjectAddress)) {
      return NextResponse.json({ error: 'Invalid subject wallet address' }, { status: 400 });
    }

    // ── 2. Mock KYC check ────────────────────────────────────────────────────
    const kycResult = runMockKycCheck({ fullName, nationality, dob, documentNumber });
    if (!kycResult.approved) {
      return NextResponse.json({ error: `KYC rejected: ${kycResult.reason}` }, { status: 422 });
    }

    // ── 3. Validate env ──────────────────────────────────────────────────────
    const issuerPrivateKeyHex = process.env.ISSUER_DID_PRIVATE_KEY ?? '';
    const deployerPrivateKey  = process.env.DEPLOYER_PRIVATE_KEY ?? '';
    const alchemyAmoyUrl      = process.env.ALCHEMY_AMOY_URL ?? '';

    if (!issuerPrivateKeyHex || !deployerPrivateKey || !alchemyAmoyUrl) {
      return NextResponse.json({ error: 'Server misconfigured — check .env' }, { status: 500 });
    }

    // ── 4. Create Veramo issuer agent (VC signing key) ───────────────────────
    const { agent, issuerDid } = await createIssuerAgent({ issuerPrivateKeyHex, alchemyAmoyUrl });

    // ── 5. Generate credential ID and salt ───────────────────────────────────
    const credentialId = `urn:uuid:${uuidv4()}`;
    const salt = generateCredentialSalt();
    const subjectDid = `did:ethr:0x${(80002).toString(16)}:${subjectAddress}`;

    // ── 6. Issue JWT Verifiable Credential (Veramo signing key) ─────────────
    // PII (name, DOB, documentNumber) is intentionally excluded from the VC
    // payload — the on-chain hash is what proves issuance without leaking data.
    // Nationality is low-sensitivity and included for selective disclosure demos.
    // The salt is embedded so the verifier can recompute the on-chain hash.
    const vc = await agent.createVerifiableCredential({
      credential: {
        id: credentialId,
        issuer: { id: issuerDid },
        type: ['VerifiableCredential', 'KYCCredential'],
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        credentialSubject: {
          id: subjectDid,
          kycVerified: true,
          nationality,
          credentialSalt: salt,   // verifier extracts this to recompute the hash
        },
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      },
      proofFormat: 'jwt',
    });

    // Extract the raw JWT string from the Veramo VC object
    const vcJwt = (vc.proof as { jwt: string }).jwt;

    // ── 7. Compute hash & anchor on-chain (deployer/on-chain key) ────────────
    // Two-key design:
    //   Veramo key  → signed the JWT-VC above
    //   Deployer key → signs the on-chain anchorCredential() transaction
    const credentialHash = computeCredentialHash(credentialId, salt);

    const provider = new ethers.JsonRpcProvider(alchemyAmoyUrl);
    const deployerWallet = new ethers.Wallet(deployerPrivateKey, provider);

    const revocationRegistry = RevocationRegistry__factory.connect(
      contractAddresses.RevocationRegistry,
      deployerWallet
    );

    const tx = await revocationRegistry.anchorCredential(credentialHash);
    await tx.wait();

    // ── 8. Return VC + anchor details ────────────────────────────────────────
    return NextResponse.json({
      vcJwt,
      credentialId,
      credentialHash,
      txHash: tx.hash,
      issuerDid,
      subjectDid,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('[issue-vc]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
