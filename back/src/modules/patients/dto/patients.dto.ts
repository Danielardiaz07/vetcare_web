import { Sex, Species } from "@prisma/client";
import { z } from "zod";
import { FieldLimit } from "@/config/constants";
import { paginationQuerySchema } from "@/shared/utils/pagination";
import type { Age } from "@/shared/utils/age";

const nameField = z
  .string()
  .trim()
  .min(1, "El nombre es obligatorio")
  .max(
    FieldLimit.PATIENT_NAME_MAX,
    `El nombre admite maximo ${FieldLimit.PATIENT_NAME_MAX} caracteres`,
  );

const breedField = z
  .string()
  .trim()
  .min(1, "La raza es obligatoria")
  .max(FieldLimit.BREED_MAX, `La raza admite maximo ${FieldLimit.BREED_MAX} caracteres`);

// DATE sin hora (07): se interpreta a medianoche UTC para no correr el día por la zona.
const birthDateField = z.iso
  .date("La fecha de nacimiento debe tener formato AAAA-MM-DD")
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => date.getTime() <= Date.now(), "La fecha de nacimiento no puede ser futura");

const weightKgField = z
  .number("El peso debe ser un numero")
  .positive("El peso debe ser mayor a 0")
  .max(FieldLimit.WEIGHT_KG_MAX, `El peso admite maximo ${FieldLimit.WEIGHT_KG_MAX} kg`)
  .multipleOf(0.01, "El peso admite maximo 2 decimales");

export const createPatientRequestSchema = z.object({
  ownerId: z.uuid("Identificador de propietario invalido"),
  name: nameField,
  species: z.enum(Species),
  breed: breedField,
  sex: z.enum(Sex),
  birthDate: birthDateField,
  weightKg: weightKgField,
});

// El paciente no cambia de propietario: el vínculo es parte de su historial (RN-16).
export const updatePatientRequestSchema = z
  .object({
    name: nameField,
    species: z.enum(Species),
    breed: breedField,
    sex: z.enum(Sex),
    birthDate: birthDateField,
    weightKg: weightKgField,
    active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Envia al menos un campo para actualizar");

export const listPatientsQuerySchema = paginationQuerySchema.extend({
  ownerId: z.uuid("Identificador de propietario invalido").optional(),
  species: z.enum(Species).optional(),
  q: z.string().trim().min(1).max(FieldLimit.SEARCH_MAX).optional(),
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const listMyPatientsQuerySchema = paginationQuerySchema;

export type CreatePatientRequestDto = z.infer<typeof createPatientRequestSchema>;
export type UpdatePatientRequestDto = z.infer<typeof updatePatientRequestSchema>;
export type ListPatientsQueryDto = z.infer<typeof listPatientsQuerySchema>;
export type ListMyPatientsQueryDto = z.infer<typeof listMyPatientsQuerySchema>;

export interface PatientResponseDto {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  birthDate: string;
  age: Age;
  weightKg: number;
  photoPath: string | null;
  active: boolean;
  createdAt: Date;
}
