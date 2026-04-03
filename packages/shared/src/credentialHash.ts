import { ethers } from 'ethers';

/**
 * Generate a cryptographically random salt as a bytes32 hex string.
 *
 * The salt MUST be stored inside the JWT-VC payload (credentialSubject.credentialSalt).
 * The verifier extracts it from the presented VC and recomputes the hash to check
 * against the on-chain anchor — without the salt, verification is impossible.
 */
export function generateCredentialSalt(): string {
  return ethers.hexlify(ethers.randomBytes(32));
}

/**
 * Compute the credential hash that gets anchored on-chain via anchorCredential().
 *
 * Mirrors the Solidity encoding exactly:
 *   keccak256(abi.encodePacked(string credentialId, bytes32 salt))
 *
 * This is the canonical hash function used by ALL three services (issuer,
 * wallet, verifier). Any deviation breaks verification.
 *
 * @param credentialId - The VC's unique ID field (e.g. "urn:uuid:...")
 * @param salt         - bytes32 hex salt from generateCredentialSalt()
 * @returns bytes32 hex string — pass directly to RevocationRegistry.anchorCredential()
 */
export function computeCredentialHash(credentialId: string, salt: string): string {
  return ethers.solidityPackedKeccak256(
    ['string', 'bytes32'],
    [credentialId, salt]
  );
}
