import type { Species } from "@prisma/client";
import { z } from "zod";
import { CARD_TOKEN_LENGTH } from "@/config/constants";
import type { VaccineStatus } from "@/shared/utils/vaccine-status";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export const cardTokenParamSchema = z.object({
  token: z.string().length(CARD_TOKEN_LENGTH).regex(BASE64URL_PATTERN),
});

// Lo que el propietario o recepción usan para imprimir el QR del carné.
export interface CardLinkResponseDto {
  active: boolean;
  url?: string; // dirección que abre la verificación; solo si está activo
  qrSvg?: string;
}

// "Sin vacunas" no es lo mismo que "al día": no hay nada que verificar.
export type PublicCardStatus = VaccineStatus | "NO_RECORDS";

// Lo único que ve quien escanea el QR. Nunca incluye propietario, contacto, raza, edad ni historial clínico (RN-82).
export interface PublicCardResponseDto {
  clinic: string;
  patient: { name: string; species: Species };
  status: PublicCardStatus; // el peor estado entre las vacunas
  vaccines: {
    name: string;
    appliedAt: string;
    nextDoseAt: string | null;
    status: VaccineStatus;
  }[];
  verifiedAt: string; // ISO 8601: el estado se calcula en el momento de escanear
}
