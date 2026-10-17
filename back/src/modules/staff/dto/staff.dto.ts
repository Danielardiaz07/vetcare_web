import { DocumentType } from "@prisma/client";
import { z } from "zod";
import { FieldLimit, SLOT_MINUTES, WEEKDAY_MAX, WEEKDAY_MIN } from "@/config/constants";
import { documentNumberField, phoneField, requiredNameField } from "@/shared/schemas/fields";
import { minutesOfDay, TIME_OF_DAY_PATTERN } from "@/shared/utils/time";
import { paginationQuerySchema } from "@/shared/utils/pagination";

const MAX_BLOCKS_PER_WEEK = WEEKDAY_MAX * 8;

const specialtyField = z
  .string()
  .trim()
  .min(1, "La especialidad es obligatoria")
  .max(
    FieldLimit.SPECIALTY_MAX,
    `La especialidad admite maximo ${FieldLimit.SPECIALTY_MAX} caracteres`,
  );

const baseProfileFields = {
  userId: z.uuid("Identificador de usuario invalido"),
  documentType: z.enum(DocumentType).default(DocumentType.CC),
  documentNumber: documentNumberField,
  firstNames: requiredNameField("Los nombres"),
  lastNames: requiredNameField("Los apellidos"),
  phone: phoneField,
};

export const createGroomerRequestSchema = z.object(baseProfileFields);
export const createVeterinarianRequestSchema = z.object({
  ...baseProfileFields,
  specialty: specialtyField,
});

const updatableFields = {
  firstNames: requiredNameField("Los nombres"),
  lastNames: requiredNameField("Los apellidos"),
  phone: phoneField,
  active: z.boolean(),
};
const atLeastOneField = (data: object) => Object.keys(data).length > 0;
const atLeastOneMessage = "Envia al menos un campo para actualizar";

export const updateGroomerRequestSchema = z
  .object(updatableFields)
  .partial()
  .refine(atLeastOneField, atLeastOneMessage);
export const updateVeterinarianRequestSchema = z
  .object({ ...updatableFields, specialty: specialtyField })
  .partial()
  .refine(atLeastOneField, atLeastOneMessage);

export const listStaffQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(FieldLimit.SEARCH_MAX).optional(),
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

const timeField = z
  .string()
  .regex(TIME_OF_DAY_PATTERN, "La hora debe tener formato HH:mm")
  .refine(
    (value) => minutesOfDay(value) % SLOT_MINUTES === 0,
    `La hora debe ser multiplo de ${SLOT_MINUTES} minutos`,
  );

const scheduleBlockSchema = z
  .object({
    weekday: z.number().int().min(WEEKDAY_MIN).max(WEEKDAY_MAX),
    startTime: timeField,
    endTime: timeField,
  })
  .refine((block) => minutesOfDay(block.startTime) < minutesOfDay(block.endTime), {
    path: ["endTime"],
    message: "La hora de fin debe ser posterior a la de inicio",
  });

// Reemplaza el horario semanal completo; los bloques de un mismo dia no pueden solaparse.
export const replaceSchedulesRequestSchema = z
  .object({ schedules: z.array(scheduleBlockSchema).max(MAX_BLOCKS_PER_WEEK) })
  .superRefine(({ schedules }, ctx) => {
    const sorted = schedules
      .map((block, index) => ({ ...block, index }))
      .sort(
        (a, b) => a.weekday - b.weekday || minutesOfDay(a.startTime) - minutesOfDay(b.startTime),
      );
    sorted.forEach((block, position) => {
      const previous = sorted[position - 1];
      if (
        previous &&
        previous.weekday === block.weekday &&
        minutesOfDay(block.startTime) < minutesOfDay(previous.endTime)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["schedules", block.index, "startTime"],
          message: "El bloque se solapa con otro del mismo dia",
        });
      }
    });
  });

export type CreateStaffRequestDto = z.infer<typeof createVeterinarianRequestSchema> & {
  specialty?: string;
};
export type UpdateStaffRequestDto = z.infer<typeof updateVeterinarianRequestSchema>;
export type ListStaffQueryDto = z.infer<typeof listStaffQuerySchema>;
export type ReplaceSchedulesRequestDto = z.infer<typeof replaceSchedulesRequestSchema>;

export interface StaffResponseDto {
  id: string;
  userId: string | null;
  documentType: string;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  phone: string;
  specialty?: string;
  active: boolean;
  createdAt: Date;
}

// Lo que ve quien no es personal de la clinica (p. ej. el propietario al elegir veterinario).
export interface StaffPublicResponseDto {
  id: string;
  firstNames: string;
  lastNames: string;
  specialty?: string;
}

export interface ScheduleBlockResponseDto {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
}
