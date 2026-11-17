import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const SEPARATOR = ".";
const MAC_HEX_LENGTH = 16; // 64 bits: basta porque cada código solo sirve mientras la cita siga activa y tiene límite de peticiones

const idSchema = z.uuid();

// D-56, D-65: código "<prefijo>.<id de la cita>.<firma>". No se guarda: se firma con una clave derivada del secreto
// de acceso y de un propósito, así que un código de llegada no sirve como enlace del correo ni al revés.
export class SignedCodes {
  private readonly key: Buffer;

  constructor(
    secret: string,
    purpose: string,
    private readonly prefix: string,
  ) {
    this.key = createHmac("sha256", secret).update(purpose).digest();
  }

  issue(appointmentId: string): string {
    return [this.prefix, appointmentId, this.mac(appointmentId)].join(SEPARATOR);
  }

  // Devuelve el id de la cita si el código es auténtico; null si está mal formado o la firma no coincide.
  verify(code: string): string | null {
    const [prefix, appointmentId, mac, ...rest] = code.trim().split(SEPARATOR);
    if (prefix !== this.prefix || !appointmentId || !mac || rest.length > 0) return null;
    if (!idSchema.safeParse(appointmentId).success) return null;

    const expected = Buffer.from(this.mac(appointmentId));
    const received = Buffer.from(mac);
    return expected.length === received.length && timingSafeEqual(expected, received)
      ? appointmentId
      : null;
  }

  private mac(appointmentId: string): string {
    return createHmac("sha256", this.key)
      .update(appointmentId)
      .digest("hex")
      .slice(0, MAC_HEX_LENGTH);
  }
}
