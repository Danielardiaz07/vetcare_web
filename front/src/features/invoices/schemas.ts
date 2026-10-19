import { z } from "zod";
import { FIELD_LIMITS } from "@/lib/constants";

const { DOCUMENT_NUMBER_MIN, DOCUMENT_NUMBER_MAX, VOID_REASON_MAX } = FIELD_LIMITS;
const DIGITS = /^\d+$/;

export const ownerSearchSchema = z.object({
  documentNumber: z
    .string()
    .trim()
    .min(1, "Escribe la cédula del propietario")
    .regex(DIGITS, "La cédula solo admite números")
    .min(DOCUMENT_NUMBER_MIN, `La cédula tiene mínimo ${DOCUMENT_NUMBER_MIN} dígitos`)
    .max(DOCUMENT_NUMBER_MAX, `La cédula tiene máximo ${DOCUMENT_NUMBER_MAX} dígitos`),
});

export type OwnerSearchInput = z.infer<typeof ownerSearchSchema>;

// RN-74: anular exige motivo.
export const voidInvoiceSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, "Escribe el motivo de la anulación")
    .max(VOID_REASON_MAX, `El motivo admite máximo ${VOID_REASON_MAX} caracteres`),
});

export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>;
