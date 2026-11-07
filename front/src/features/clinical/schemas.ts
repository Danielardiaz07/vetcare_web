import { z } from "zod";
import { clinicDateOf } from "@/lib/clinic-time";
import { FIELD_LIMITS } from "@/lib/constants";

const {
  CLINICAL_TEXT_MAX,
  LONG_TEXT_MAX,
  TEMPERATURE_MAX,
  WEIGHT_KG_MAX,
  COST_MAX,
  VACCINE_LOT_MAX,
  PROCEDURE_MAX,
  EXAM_TYPE_MAX,
} = FIELD_LIMITS;
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

// RN-48: la próxima dosis es opcional, pero si se escribe va después de la aplicación.
export const vaccinationSchema = z
  .object({
    vaccineId: z.string().min(1, "Selecciona la vacuna"),
    lot: requiredText("El lote", "El lote es obligatorio", VACCINE_LOT_MAX),
    appliedAt: z.iso
      .date("Escribe la fecha de aplicación")
      .refine(
        (date) => date <= clinicDateOf(new Date()),
        "La fecha de aplicación no puede ser futura",
      ),
    nextDoseAt: z.union([z.literal(""), z.iso.date("Escribe una fecha válida")]),
  })
  .refine((input) => !input.nextDoseAt || input.nextDoseAt > input.appliedAt, {
    message: "La próxima dosis debe ser después de la aplicación",
    path: ["nextDoseAt"],
  });

export type VaccinationFormInput = z.infer<typeof vaccinationSchema>;

// D-34: un procedimiento o examen ya realizado no puede tener fecha futura.
const pastDate = (required: string) =>
  z.iso
    .date(required)
    .refine((date) => date <= clinicDateOf(new Date()), "La fecha no puede ser futura");

export const surgerySchema = z.object({
  procedure: requiredText("El procedimiento", "Escribe el procedimiento", PROCEDURE_MAX),
  performedAt: pastDate("Escribe la fecha de la cirugía"),
  notes: optionalText("Las notas", LONG_TEXT_MAX),
});

export type SurgeryFormInput = z.infer<typeof surgerySchema>;

export const labExamSchema = z.object({
  examType: requiredText("El tipo de examen", "Escribe el tipo de examen", EXAM_TYPE_MAX),
  performedAt: pastDate("Escribe la fecha del examen"),
  results: requiredText("Los resultados", "Escribe los resultados", LONG_TEXT_MAX),
});

export type LabExamFormInput = z.infer<typeof labExamSchema>;

export const admissionSchema = z.object({
  reason: requiredText("El motivo", "Escribe el motivo de la internación", CLINICAL_TEXT_MAX),
});

export type AdmissionFormInput = z.infer<typeof admissionSchema>;

export const dischargeSchema = z.object({
  notes: optionalText("Las notas de egreso", CLINICAL_TEXT_MAX),
});

export type DischargeFormInput = z.infer<typeof dischargeSchema>;
