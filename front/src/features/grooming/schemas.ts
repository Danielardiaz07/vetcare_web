import { z } from "zod";
import { FIELD_LIMITS } from "@/lib/constants";
import { GROOMING_TYPES } from "@/features/grooming/labels";

const { GROOMING_OBSERVATIONS_MAX, COST_MAX } = FIELD_LIMITS;

// RN-51: tipo y costo son obligatorios; las observaciones, opcionales.
export const groomingServiceSchema = z.object({
  type: z.enum(GROOMING_TYPES, "Elige el tipo de servicio"),
  observations: z
    .string()
    .trim()
    .max(
      GROOMING_OBSERVATIONS_MAX,
      `Las observaciones admiten máximo ${GROOMING_OBSERVATIONS_MAX} caracteres`,
    ),
  cost: z
    .number("Escribe el costo del servicio")
    .int("Escribe el costo sin decimales")
    .min(0, "El costo no puede ser negativo")
    .max(COST_MAX, "El costo es demasiado alto"),
});

export type GroomingServiceFormInput = z.infer<typeof groomingServiceSchema>;
