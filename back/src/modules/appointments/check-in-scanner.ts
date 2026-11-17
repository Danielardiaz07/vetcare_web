import { createHash, timingSafeEqual } from "node:crypto";
import { HTTPS_SCHEME, SCANNER_PAGE_PATH } from "@/config/constants";

// D-66, RN-85: la página de escaneo de recepción no usa sesión; se abre con un enlace que lleva este token secreto.
// Sin token configurado, la página queda desactivada.
export class CheckInScanner {
  private readonly digest: Buffer | null;

  constructor(private readonly token: string | undefined) {
    this.digest = token ? sha256(token) : null;
  }

  accepts(candidate: string): boolean {
    return this.digest !== null && timingSafeEqual(this.digest, sha256(candidate));
  }

  // D-68: el enlace solo se arma por HTTPS, porque el navegador del celular no abre la cámara en una dirección sin cifrar.
  accessLink(frontendUrl: string | undefined): string | null {
    if (!this.token || !frontendUrl?.startsWith(HTTPS_SCHEME)) return null;
    return `${frontendUrl.replace(/\/+$/, "")}${SCANNER_PAGE_PATH}/${this.token}`;
  }
}

const sha256 = (value: string): Buffer => createHash("sha256").update(value).digest();
