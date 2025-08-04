import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Encryption key - in production, this should be stored in environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const ALGORITHM = "aes-256-cbc";

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
