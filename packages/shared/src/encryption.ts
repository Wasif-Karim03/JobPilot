import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is not set");
  if (key.length !== 64)
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)");
  return Buffer.from(key, "hex");
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const KEY = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return {
    encrypted: encrypted + ":" + authTag,
    iv: iv.toString("hex"),
  };
}

export function decrypt(encrypted: string, iv: string): string {
  const KEY = getKey();
  const [encryptedData, authTag] = encrypted.split(":");
  if (!encryptedData || !authTag) throw new Error("Invalid encrypted data format");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(iv, "hex"));
  decipher.setAuthTag(Buffer.from(authTag, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
