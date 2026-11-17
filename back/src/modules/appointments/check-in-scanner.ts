import { createHash, timingSafeEqual } from "node:crypto";

// D-66, RN-85: la página de escaneo de recepción no usa sesión; se abre con un enlace que lleva este token secreto.
// Sin token configurado, la página queda desactivada.
export class CheckInScanner {
  private readonly digest: Buffer | null;

  constructor(token: string | undefined) {
    this.digest = token ? sha256(token) : null;
  }

  accepts(candidate: string): boolean {
    return this.digest !== null && timingSafeEqual(this.digest, sha256(candidate));
  }
}

const sha256 = (value: string): Buffer => createHash("sha256").update(value).digest();
