import { z } from "zod";
import { SEX_OPTIONS, SPECIES_OPTIONS } from "@/features/patients/labels";
import { FIELD_LIMITS } from "@/lib/constants";

const { PATIENT_NAME_MAX, BREED_MAX, WEIGHT_KG_MAX } = FIELD_LIMITS;
const ONE_DECIMAL = /^\d+(\.\d)?$/;

// AAAA-MM-DD de hoy en la hora local, para comparar con el valor del campo de fecha.
const todayIso = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const patientSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(PATIENT_NAME_MAX, `El nombre admite máximo ${PATIENT_NAME_MAX} caracteres`),
  species: z.enum(SPECIES_OPTIONS, "Selecciona la especie"),
  breed: z
    .string()
    .trim()
    .min(1, "La raza es obligatoria")
    .max(BREED_MAX, `La raza admite máximo ${BREED_MAX} caracteres`),
  sex: z.enum(SEX_OPTIONS, "Selecciona el sexo"),
  birthDate: z.iso
    .date("Escribe la fecha de nacimiento")
    .refine((date) => date <= todayIso(), "La fecha de nacimiento no puede ser futura"),
  weightKg: z
    .number("Escribe el peso en kg")
    .positive("El peso debe ser mayor a 0")
    .max(WEIGHT_KG_MAX, `El peso admite máximo ${WEIGHT_KG_MAX} kg`)
    .refine((weight) => ONE_DECIMAL.test(String(weight)), "El peso admite un solo decimal"),
});

export type PatientFormInput = z.infer<typeof patientSchema>;
