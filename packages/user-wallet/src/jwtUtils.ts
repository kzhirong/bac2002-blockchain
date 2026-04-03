/** Decode the payload section of a JWT without verifying the signature. */
function decodePayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error('Not a valid JWT');
  // Base64url → base64 → binary string
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded  = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

export interface DecodedVC {
  credentialId: string;   // urn:uuid:...
  issuerDid: string;      // did:ethr:amoy:0x...
  subjectDid: string;     // did:ethr:amoy:0x...
  nationality: string;
  credentialSalt: string; // 0x... (32 bytes, hex)
  expirationDate: string; // ISO 8601
  issuedAt: string;       // ISO 8601
}

/** Extract the fields we care about from the VC JWT payload. */
export function parseVC(vcJwt: string): DecodedVC {
  const payload = decodePayload(vcJwt);

  // Veramo wraps the credential under payload.vc
  const vc = payload.vc as {
    id?: string;
    credentialSubject?: {
      id?: string;
      nationality?: string;
      credentialSalt?: string;
    };
    expirationDate?: string;
  };

  const credentialId    = (payload.jti as string | undefined) ?? vc.id ?? '';
  const issuerDid       = (payload.iss as string | undefined) ?? '';
  const subjectDid      = vc.credentialSubject?.id ?? (payload.sub as string | undefined) ?? '';
  const nationality     = vc.credentialSubject?.nationality ?? '';
  const credentialSalt  = vc.credentialSubject?.credentialSalt ?? '';
  const expirationDate  = vc.expirationDate ?? new Date((payload.exp as number) * 1000).toISOString();
  const issuedAt        = new Date(((payload.iat as number) ?? 0) * 1000).toISOString();

  return { credentialId, issuerDid, subjectDid, nationality, credentialSalt, expirationDate, issuedAt };
}

/** Build the canonical message that MetaMask will sign for the VP. */
export function buildVpSigningMessage(params: {
  holderDid: string;
  credentialId: string;
  challenge: string;
}): string {
  return [
    'KYC Verifiable Presentation',
    `Holder:      ${params.holderDid}`,
    `Credential:  ${params.credentialId}`,
    `Challenge:   ${params.challenge}`,
    '',
    'I authorize sharing the above Verifiable Credential.',
  ].join('\n');
}

/** Assemble the JSON-LD VP object (without proof). */
export function buildVpBody(holderDid: string, vcJwt: string) {
  return {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiablePresentation'],
    holder: holderDid,
    verifiableCredential: [vcJwt],
  };
}
