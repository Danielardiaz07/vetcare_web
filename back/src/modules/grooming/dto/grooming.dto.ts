import { GroomingType } from "@prisma/client";
import { z } from "zod";
import { GROOMING_OBSERVATIONS_MAX } from "@/config/constants";
import { moneyField } from "@/shared/schemas/fields";

export const createGroomingServiceRequestSchema = z.object({
  patientId: z.uuid("Identificador invalido"),
  appointmentId: z.uuid("Identificador invalido").optional(),
  type: z.enum(GroomingType),
  observations: z
    .string()
    .trim()
    .max(
      GROOMING_OBSERVATIONS_MAX,
      `Las observaciones admiten maximo ${GROOMING_OBSERVATIONS_MAX} caracteres`,
    )
    .optional(),
  cost: moneyField,
});

export type CreateGroomingServiceRequestDto = z.infer<typeof createGroomingServiceRequestSchema>;

export interface GroomingServiceResponseDto {
  id: string;
  appointmentId: string | null;
  patientId: string;
  type: GroomingType;
  observations: string | null;
  cost: number;
  groomer: { id: string; firstNames: string; lastNames: string };
  createdAt: Date;
}
