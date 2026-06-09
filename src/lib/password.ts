/**
 * Password hashing utilities that work on both Node.js (Vercel) and Bun.
 * Uses PBKDF2 from the Web Crypto API for maximum compatibility.
 */

const ITERATIONS = 10000;
const KEY_LENGTH = 256; // bits
const SALT_LENGTH = 16; // bytes

function toHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Hash a password using PBKDF2 with a random salt.
 * Returns a string in the format "salt:hash" for storage.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_LENGTH
  );

  const hash = toHex(new Uint8Array(derivedBits));
  const saltHex = toHex(salt);

  return `${saltHex}:${hash}`;
}

/**
 * Verify a password against a stored hash.
 * Supports both the new PBKDF2 format ("salt:hash") and the legacy SHA-256 format.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  // Check if it's the new PBKDF2 format
  if (storedHash.includes(':')) {
    const [saltHex, hash] = storedHash.split(':');
    const salt = fromHex(saltHex);
    const encoder = new TextEncoder();

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      KEY_LENGTH
    );

    const inputHash = toHex(new Uint8Array(derivedBits));
    return inputHash === hash;
  }

  // Legacy: unsalted SHA-256 (for backward compatibility with existing users)
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const inputHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return inputHash === storedHash;
}
