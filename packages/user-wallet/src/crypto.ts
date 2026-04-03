/**
 * AES-256-GCM encryption + PBKDF2 key derivation using the built-in Web Crypto API.
 * No external crypto libraries required.
 *
 * Storage layout (all concatenated, then base64-encoded):
 *   bytes  0–15  : PBKDF2 salt  (16 bytes, random)
 *   bytes 16–27  : AES-GCM IV   (12 bytes, random)
 *   bytes 28+    : ciphertext   (variable)
 */

const PBKDF2_ITERATIONS = 600_000;

async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypts a VC JWT string with the user's PIN. Returns a base64-encoded blob. */
export async function encryptVC(vcJwt: string, pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(pin, salt);

  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(vcJwt),
  );

  const cipher = new Uint8Array(cipherBuf);
  const combined = new Uint8Array(16 + 12 + cipher.length);
  combined.set(salt,   0);
  combined.set(iv,    16);
  combined.set(cipher, 28);

  // btoa requires Latin-1; spread Uint8Array for compatibility
  return btoa(String.fromCharCode(...combined));
}

/** Decrypts the base64 blob produced by encryptVC. Throws on wrong PIN. */
export async function decryptVC(stored: string, pin: string): Promise<string> {
  const bytes  = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
  const salt   = bytes.slice(0, 16);
  const iv     = bytes.slice(16, 28);
  const cipher = bytes.slice(28);
  const key    = await deriveKey(pin, salt);

  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plainBuf);
}
