import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

export const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export const createInviteToken = () => randomBytes(32).toString("hex");

export const hashInviteToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const inviteExpiresAt = (from = new Date()) =>
  new Date(from.getTime() + INVITE_TTL_MS);

export const buildInviteUrl = (token: string) => {
  const base =
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  return `${base}/admin/convite/${token}`;
};

const encryptionKey = () => {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET não está definida.");
  }

  return createHash("sha256").update(secret).digest();
};

export const encryptInviteToken = (token: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decryptInviteToken = (payload: string) => {
  const [ivHex, tagHex, dataHex] = payload.split(":");

  if (!ivHex || !tagHex || !dataHex) {
    throw new Error("Token cifrado inválido.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));

  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
};
