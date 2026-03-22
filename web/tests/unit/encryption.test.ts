import { describe, it, expect, beforeEach } from "vitest";

// Set up a valid 64-char hex ENCRYPTION_KEY before importing
const TEST_KEY = "a".repeat(64); // 32 bytes of 0xaa

beforeEach(() => {
  process.env.ENCRYPTION_KEY = TEST_KEY;
});

// Lazy import so env is set first
async function getEncryption() {
  // Clear module cache to pick up fresh env
  const mod = await import("@jobpilot/shared/encryption");
  return mod;
}

describe("encrypt / decrypt", () => {
  it("roundtrip: decrypt(encrypt(x)) === x", async () => {
    const { encrypt, decrypt } = await getEncryption();
    const plaintext = "sk-ant-api-test-key-12345";
    const { encrypted, iv } = encrypt(plaintext);
    expect(decrypt(encrypted, iv)).toBe(plaintext);
  });

  it("returns different ciphertexts for same input (random IV)", async () => {
    const { encrypt } = await getEncryption();
    const { encrypted: a } = encrypt("same");
    const { encrypted: b } = encrypt("same");
    expect(a).not.toBe(b);
  });

  it("encrypted value contains auth tag separator", async () => {
    const { encrypt } = await getEncryption();
    const { encrypted } = encrypt("hello");
    expect(encrypted).toContain(":");
  });

  it("throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await getEncryption();
    const { encrypted, iv } = encrypt("secret");
    const tampered = encrypted.slice(0, -4) + "0000";
    expect(() => decrypt(tampered, iv)).toThrow();
  });

  it("throws on wrong IV", async () => {
    const { encrypt, decrypt } = await getEncryption();
    const { encrypted } = encrypt("secret");
    const wrongIv = "0".repeat(32);
    expect(() => decrypt(encrypted, wrongIv)).toThrow();
  });

  it("throws when ENCRYPTION_KEY is not set", async () => {
    delete process.env.ENCRYPTION_KEY;
    const { encrypt } = await getEncryption();
    expect(() => encrypt("x")).toThrow("ENCRYPTION_KEY");
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  it("throws when ENCRYPTION_KEY is wrong length", async () => {
    process.env.ENCRYPTION_KEY = "abc";
    const { encrypt } = await getEncryption();
    expect(() => encrypt("x")).toThrow("64-character");
    process.env.ENCRYPTION_KEY = TEST_KEY;
  });

  it("handles unicode characters", async () => {
    const { encrypt, decrypt } = await getEncryption();
    const text = "こんにちは 🚀 café";
    const { encrypted, iv } = encrypt(text);
    expect(decrypt(encrypted, iv)).toBe(text);
  });
});
