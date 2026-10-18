import { z } from "zod";
import { registerFieldsSchema } from "@/features/auth/schemas";
import { FIELD_LIMITS } from "@/lib/constants";

const { SPECIALTY_MAX } = FIELD_LIMITS;

// Los mismos documentos, nombres y celular del registro.
const profileFields = registerFieldsSchema.pick({
  documentType: true,
  documentNumber: true,
  firstNames: true,
  lastNames: true,
  phone: true,
});

// D-22: el perfil se enlaza a una cuenta que el administrador creó antes en Usuarios.
export const groomerSchema = profileFields.extend({
  userId: z.string().min(1, "Selecciona la cuenta del usuario"),
  specialty: z.string().optional(),
});

export const veterinarianSchema = groomerSchema.extend({
  specialty: z
    .string()
    .trim()
    .min(1, "La especialidad es obligatoria")
    .max(SPECIALTY_MAX, `La especialidad admite máximo ${SPECIALTY_MAX} caracteres`),
});

export type StaffFormInput = z.infer<typeof groomerSchema>;

// Al editar, la cuenta y el documento no cambian y el tipo puede ser uno que el registro no ofrece.
const fixedFields = {
  userId: z.string(),
  documentType: z.custom<StaffFormInput["documentType"]>(),
  documentNumber: z.string(),
};
export const groomerEditSchema = groomerSchema.extend(fixedFields);
export const veterinarianEditSchema = veterinarianSchema.extend(fixedFields);

const timeField = z.string().min(1, "Elige una hora");

const blockSchema = z
  .object({ weekday: z.number(), startTime: timeField, endTime: timeField })
  .refine((block) => block.startTime < block.endTime, {
    path: ["endTime"],
    message: "La hora de fin debe ser posterior a la de inicio",
  });

// D-22: los bloques de un mismo día no se cruzan. "HH:mm" se compara bien como texto.
export const scheduleSchema = z
  .object({ blocks: z.array(blockSchema) })
  .superRefine(({ blocks }, ctx) => {
    const sorted = blocks
      .map((block, index) => ({ ...block, index }))
      .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));
    sorted.forEach((block, position) => {
      const previous = sorted[position - 1];
      if (previous && previous.weekday === block.weekday && block.startTime < previous.endTime) {
        ctx.addIssue({
          code: "custom",
          path: ["blocks", block.index, "startTime"],
          message: "Este bloque se cruza con otro del mismo día",
        });
      }
    });
  });

export type ScheduleFormInput = z.infer<typeof scheduleSchema>;
