const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12;
const TAG_LENGTH = 128; // bits

let cachedKey: CryptoKey | null = null;

function getMasterKeyBase64(): string {
  const key = process.env.VAULT_MASTER_KEY;
  if (!key) {
    throw new Error("VaultNotConfiguredException");
  }
  return key;
}

async function getMasterKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const keyBase64 = getMasterKeyBase64();
  const keyBuffer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  if (keyBuffer.length !== 32) {
    throw new Error("VAULT_MASTER_KEY must be exactly 32 bytes (base64-encoded)");
  }

  cachedKey = await crypto.subtle.importKey("raw", keyBuffer, { name: ALGORITHM }, false, [
    "encrypt",
    "decrypt",
  ]);

  return cachedKey;
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Returns base64(IV + ciphertext + authTag).
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoded,
  );

  // Web Crypto appends the auth tag to the ciphertext
  const combined = new Uint8Array(IV_LENGTH + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), IV_LENGTH);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64(IV + ciphertext + authTag) blob back to plaintext.
 */
export async function decrypt(ciphertext: string): Promise<string> {
  const key = await getMasterKey();
  const combined = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, IV_LENGTH);
  const data = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    data,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Returns true if VAULT_MASTER_KEY env var is set.
 */
export function isVaultConfigured(): boolean {
  return !!process.env.VAULT_MASTER_KEY;
}

/**
 * Hashes a value using SHA-256 and returns the hex string.
 * Used for audit log old_value_hash (never store actual secret values in audit).
 */
export async function hashValue(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Clear the cached key (useful for testing).
 */
export function _clearCachedKey(): void {
  cachedKey = null;
}
