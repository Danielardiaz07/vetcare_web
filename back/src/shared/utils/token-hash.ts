import { createHash, randomBytes } from "node:crypto";

export const generateOpaqueToken = (bytes: number): string =>
  randomBytes(bytes).toString("base64url");

// Solo se guarda el hash: una fuga de la base de datos no entrega enlaces de recuperación válidos.
export const sha256Hex = (value: string): string =>
  createHash("sha256").update(value).digest("hex");
