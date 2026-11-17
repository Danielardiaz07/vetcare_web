import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { SignedCodes } from "@/shared/utils/signed-code";

const SEPARATOR = ".";
const PREFIX = "VC2";
const PURPOSE = "check-in";
const MAC_HEX_LENGTH = 16; // 64 bits: basta porque cada código solo sirve mientras la cita siga programada y tiene límite de peticiones
const MS_PER_SECOND = 1000;

const idSchema = z.uuid();
const secondsSchema = z.string().regex(/^\d{1,12}$/);

export interface CheckInPayload {
  appointmentId: string;
  startsAtSeconds: number;
}

// D-56, D-66, RN-83: código de llegada, "VC2.<id de la cita>.<inicio en segundos>.<firma>". No se guarda. Lleva el inicio
// de la cita: si se reprograma, el código anterior deja de coincidir y hay que usar el nuevo. Se firma con una clave
// derivada del secreto y de un propósito, así que no sirve como enlace de gestión ni al revés.
export class CheckInCodes {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = createHmac("sha256", secret).update(PURPOSE).digest();
  }

  issue(appointmentId: string, startsAt: Date): string {
    const seconds = secondsOf(startsAt);
    return [PREFIX, appointmentId, seconds, this.mac(appointmentId, seconds)].join(SEPARATOR);
  }

  // Devuelve los datos del código si es auténtico; null si está mal formado o la firma no coincide.
  verify(code: string): CheckInPayload | null {
    const [prefix, appointmentId, seconds, mac, ...rest] = code.trim().split(SEPARATOR);
    if (prefix !== PREFIX || !appointmentId || !seconds || !mac || rest.length > 0) return null;
    if (!idSchema.safeParse(appointmentId).success || !secondsSchema.safeParse(seconds).success) {
      return null;
    }

    const expected = Buffer.from(this.mac(appointmentId, Number(seconds)));
    const received = Buffer.from(mac);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    return { appointmentId, startsAtSeconds: Number(seconds) };
  }

  matches(payload: CheckInPayload, startsAt: Date): boolean {
    return payload.startsAtSeconds === secondsOf(startsAt);
  }

  private mac(appointmentId: string, seconds: number): string {
    return createHmac("sha256", this.key)
      .update(`${appointmentId}${SEPARATOR}${seconds}`)
      .digest("hex")
      .slice(0, MAC_HEX_LENGTH);
  }
}

const secondsOf = (date: Date): number => Math.floor(date.getTime() / MS_PER_SECOND);

// D-65, RN-84: enlace de los correos para cambiar o cancelar la cita, "MG1.<id de la cita>.<firma>".
export class ManageLinks extends SignedCodes {
  constructor(secret: string) {
    super(secret, "manage", "MG1");
  }
}
