import { z } from "zod";
import { FIELD_LIMITS } from "@/lib/constants";

const { APPOINTMENT_REASON_MAX } = FIELD_LIMITS;

export const reviewSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(APPOINTMENT_REASON_MAX, `El motivo admite máximo ${APPOINTMENT_REASON_MAX} caracteres`),
});

export type ReviewFormInput = z.infer<typeof reviewSchema>;

export const CANCEL_REASONS = {
  CANT_ATTEND: "No puedo asistir",
  PET_IS_WELL: "Mi mascota ya está bien",
  OTHER: "Otro",
} as const;

export type CancelReason = keyof typeof CANCEL_REASONS;

const CANCEL_REASON_OPTIONS = Object.keys(CANCEL_REASONS) as [CancelReason, ...CancelReason[]];

export const cancelSchema = z
  .object({
    choice: z.enum(CANCEL_REASON_OPTIONS, "Elige el motivo"),
    other: z
      .string()
      .trim()
      .max(APPOINTMENT_REASON_MAX, `El motivo admite máximo ${APPOINTMENT_REASON_MAX} caracteres`),
  })
  .refine((input) => input.choice !== "OTHER" || input.other.length > 0, {
    message: "Escribe el motivo",
    path: ["other"],
  });

export type CancelFormInput = z.infer<typeof cancelSchema>;

// La API guarda el motivo como texto: la opción elegida o lo que se escribió en "Otro".
export const cancelReasonText = ({ choice, other }: CancelFormInput) =>
  choice === "OTHER" ? other : CANCEL_REASONS[choice];
