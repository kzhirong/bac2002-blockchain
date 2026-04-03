/** Decode the payload section of a JWT without verifying the signature. */
export function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split('.');
  if (parts.length !== 3) throw new Error('Not a valid JWT');
  const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded  = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

/** Extract the Ethereum address from a did:ethr DID string.
 *  Handles: did:ethr:0x13882:0xAbc...  and  did:ethr:amoy:0xAbc...
 */
export function extractAddressFromDid(did: string): string {
  const parts = did.split(':');
  const addr = parts[parts.length - 1];
  if (!addr.startsWith('0x')) throw new Error(`Cannot extract address from DID: ${did}`);
  return addr;
}

/** The signing message used by the wallet when generating a VP.
 *  Must match exactly what PresentPage.tsx produces. */
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
