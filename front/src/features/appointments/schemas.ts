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
