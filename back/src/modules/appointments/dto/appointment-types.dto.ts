import { AppointmentType } from "@prisma/client";
import { z } from "zod";
import { MINUTES_PER_DAY, SLOT_MINUTES } from "@/config/constants";

export const appointmentTypeParamSchema = z.object({ type: z.enum(AppointmentType) });

export const updateAppointmentTypeRequestSchema = z.object({
  durationMinutes: z
    .number()
    .int()
    .min(SLOT_MINUTES, `La duracion minima es de ${SLOT_MINUTES} minutos`)
    .max(MINUTES_PER_DAY)
    .refine(
      (value) => value % SLOT_MINUTES === 0,
      `La duracion debe ser multiplo de ${SLOT_MINUTES} minutos`,
    ),
});

export type UpdateAppointmentTypeRequestDto = z.infer<typeof updateAppointmentTypeRequestSchema>;

export interface AppointmentTypeResponseDto {
  type: string;
  durationMinutes: number;
  professional: "VETERINARIAN" | "GROOMER";
}
