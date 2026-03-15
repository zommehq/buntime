import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { _clearCachedKey, decrypt, encrypt, isVaultConfigured } from "./crypto.ts";

// Valid 32-byte key base64-encoded
const TEST_KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(0xab)));
// Different 32-byte key
const WRONG_KEY = btoa(String.fromCharCode(...new Uint8Array(32).fill(0xcd)));

describe("crypto", () => {
  beforeEach(() => {
    _clearCachedKey();
    process.env.VAULT_MASTER_KEY = TEST_KEY;
  });

  afterEach(() => {
    _clearCachedKey();
    delete process.env.VAULT_MASTER_KEY;
  });

  test("round-trip: encrypt then decrypt returns original", async () => {
    const plaintext = "my-super-secret-value";
    const ciphertext = await encrypt(plaintext);
    const decrypted = await decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  test("round-trip with empty string", async () => {
    const ciphertext = await encrypt("");
    const decrypted = await decrypt(ciphertext);
    expect(decrypted).toBe("");
  });

  test("round-trip with unicode", async () => {
    const plaintext = "senha secreta com acentos e emojis";
    const ciphertext = await encrypt(plaintext);
    const decrypted = await decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  test("different plaintexts produce different ciphertexts", async () => {
    const ct1 = await encrypt("value-one");
    const ct2 = await encrypt("value-two");
    expect(ct1).not.toBe(ct2);
  });

  test("same plaintext produces different ciphertexts (random IV)", async () => {
    const ct1 = await encrypt("same-value");
    const ct2 = await encrypt("same-value");
    expect(ct1).not.toBe(ct2);
  });

  test("decrypt with wrong key fails", async () => {
    const ciphertext = await encrypt("secret");

    // Switch to a different key
    _clearCachedKey();
    process.env.VAULT_MASTER_KEY = WRONG_KEY;

    expect(decrypt(ciphertext)).rejects.toThrow();
  });

  test("encrypt without VAULT_MASTER_KEY throws VaultNotConfiguredException", async () => {
    _clearCachedKey();
    delete process.env.VAULT_MASTER_KEY;

    expect(encrypt("test")).rejects.toThrow("VaultNotConfiguredException");
  });

  test("decrypt without VAULT_MASTER_KEY throws VaultNotConfiguredException", async () => {
    _clearCachedKey();
    delete process.env.VAULT_MASTER_KEY;

    expect(decrypt("dGVzdA==")).rejects.toThrow("VaultNotConfiguredException");
  });

  test("isVaultConfigured returns true when key is set", () => {
    expect(isVaultConfigured()).toBe(true);
  });

  test("isVaultConfigured returns false when key is unset", () => {
    delete process.env.VAULT_MASTER_KEY;
    expect(isVaultConfigured()).toBe(false);
  });
});
