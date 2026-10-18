import { z } from "zod";
import { FIELD_LIMITS } from "@/lib/constants";

const { CLINICAL_TEXT_MAX, LONG_TEXT_MAX, TEMPERATURE_MAX, WEIGHT_KG_MAX, COST_MAX } = FIELD_LIMITS;
const ONE_DECIMAL = /^\d+(\.\d)?$/;

const requiredText = (label: string, required: string, max: number) =>
  z.string().trim().min(1, required).max(max, `${label} admite máximo ${max} caracteres`);

const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} admite máximo ${max} caracteres`);

// RN-45: diagnóstico y tratamiento son obligatorios; síntomas, peso, temperatura y costo también (RF-18).
export const consultationSchema = z.object({
  symptoms: requiredText("Los síntomas", "Los síntomas son obligatorios", CLINICAL_TEXT_MAX),
  weightKg: z
    .number("Escribe el peso en kg")
    .positive("El peso debe ser mayor a 0")
    .max(WEIGHT_KG_MAX, `El peso admite máximo ${WEIGHT_KG_MAX} kg`)
    .refine((weight) => ONE_DECIMAL.test(String(weight)), "El peso admite un solo decimal"),
  temperatureC: z
    .number("Escribe la temperatura en °C")
    .positive("La temperatura debe ser mayor a 0")
    .max(TEMPERATURE_MAX, `La temperatura admite máximo ${TEMPERATURE_MAX} °C`)
    .refine((value) => ONE_DECIMAL.test(String(value)), "La temperatura admite un solo decimal"),
  diagnosis: requiredText("El diagnóstico", "El diagnóstico es obligatorio", CLINICAL_TEXT_MAX),
  treatment: requiredText("El tratamiento", "El tratamiento es obligatorio", CLINICAL_TEXT_MAX),
  prescription: optionalText("La fórmula", LONG_TEXT_MAX),
  internalNotes: optionalText("Las notas internas", LONG_TEXT_MAX),
  cost: z
    .number("Escribe el costo de la consulta")
    .int("Escribe el costo sin decimales")
    .min(0, "El costo no puede ser negativo")
    .max(COST_MAX, "El costo es demasiado alto"),
});

export type ConsultationFormInput = z.infer<typeof consultationSchema>;
