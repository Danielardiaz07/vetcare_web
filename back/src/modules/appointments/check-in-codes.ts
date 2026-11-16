import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const PREFIX = "VC1"; // versión del formato, por si cambia
const SEPARATOR = ".";
const MAC_HEX_LENGTH = 16; // 64 bits: suficiente porque el código solo vale el día de la cita y la cita debe estar programada

const idSchema = z.uuid();

// D-56, RN-83: código de llegada de una cita, "VC1.<id de la cita>.<firma>". No se guarda: se firma con una clave
// derivada del secreto de acceso (con otro propósito), así que no hay tabla ni variable de entorno nueva.
export class CheckInCodes {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = createHmac("sha256", secret).update("check-in").digest();
  }

  issue(appointmentId: string): string {
    return [PREFIX, appointmentId, this.mac(appointmentId)].join(SEPARATOR);
  }

  // Devuelve el id de la cita si el código es auténtico; null si está mal formado o la firma no coincide.
  verify(code: string): string | null {
    const [prefix, appointmentId, mac, ...rest] = code.trim().split(SEPARATOR);
    if (prefix !== PREFIX || !appointmentId || !mac || rest.length > 0) return null;
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
