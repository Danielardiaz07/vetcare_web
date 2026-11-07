import { z } from "zod";
import { ClinicalLimit, FieldLimit } from "@/config/constants";
import { dateField, moneyField } from "@/shared/schemas/fields";
import { clinicDateOf } from "@/shared/utils/clinic-time";
import { paginationQuerySchema } from "@/shared/utils/pagination";

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio`)
    .max(max, `${label} admite maximo ${max} caracteres`);

const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} admite maximo ${max} caracteres`).optional();

export const createConsultationRequestSchema = z.object({
  appointmentId: z.uuid("Identificador invalido"),
  symptoms: requiredText("Los sintomas", ClinicalLimit.CLINICAL_TEXT_MAX),
  weightKg: z.number().positive("El peso debe ser mayor a 0").max(FieldLimit.WEIGHT_KG_MAX),
  temperatureC: z.number().min(0).max(ClinicalLimit.TEMPERATURE_MAX),
  diagnosis: requiredText("El diagnostico", ClinicalLimit.CLINICAL_TEXT_MAX), // RN-45
  treatment: requiredText("El tratamiento", ClinicalLimit.CLINICAL_TEXT_MAX), // RN-45
  prescription: optionalText("La formula", ClinicalLimit.LONG_TEXT_MAX),
  internalNotes: optionalText("Las notas internas", ClinicalLimit.LONG_TEXT_MAX),
  cost: moneyField,
});

export const createVaccinationRequestSchema = z
  .object({
    patientId: z.uuid("Identificador invalido"),
    appointmentId: z.uuid("Identificador invalido").optional(),
    vaccineId: z.uuid("Identificador invalido"),
    lot: requiredText("El lote", ClinicalLimit.LOT_MAX),
    appliedAt: dateField,
    nextDoseAt: dateField.optional(),
  })
  .refine((dto) => !dto.nextDoseAt || dto.nextDoseAt > dto.appliedAt, {
    message: "La proxima dosis debe ser posterior a la aplicacion",
    path: ["nextDoseAt"],
  });

export const createVaccineRequestSchema = z.object({
  name: requiredText("El nombre", ClinicalLimit.VACCINE_NAME_MAX),
  price: moneyField,
});

// Un procedimiento o examen ya realizado no puede tener fecha futura.
const pastOrTodayDateField = dateField.refine(
  (value) => value <= clinicDateOf(new Date()),
  "La fecha no puede ser futura",
);

export const createSurgeryRequestSchema = z.object({
  patientId: z.uuid("Identificador invalido"),
  procedure: requiredText("El procedimiento", ClinicalLimit.PROCEDURE_MAX),
  performedAt: pastOrTodayDateField,
  notes: optionalText("Las notas", ClinicalLimit.LONG_TEXT_MAX),
});

// El ingreso y el egreso toman la hora del servidor.
export const createHospitalizationRequestSchema = z.object({
  patientId: z.uuid("Identificador invalido"),
  reason: requiredText("El motivo", ClinicalLimit.CLINICAL_TEXT_MAX),
});

export const dischargeHospitalizationRequestSchema = z.object({
  notes: optionalText("Las notas de egreso", ClinicalLimit.CLINICAL_TEXT_MAX),
});

export const HOSPITALIZATION_STATUSES = ["ADMITTED", "DISCHARGED"] as const;

export const listHospitalizationsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(HOSPITALIZATION_STATUSES).optional(),
  patientId: z.uuid("Identificador invalido").optional(),
});

export const createLabExamRequestSchema = z.object({
  patientId: z.uuid("Identificador invalido"),
  examType: requiredText("El tipo de examen", ClinicalLimit.EXAM_TYPE_MAX),
  performedAt: pastOrTodayDateField,
  results: requiredText("Los resultados", ClinicalLimit.LONG_TEXT_MAX),
});

export const HISTORY_TYPES = [
  "CONSULTATION",
  "VACCINATION",
  "SURGERY",
  "HOSPITALIZATION",
  "LAB_EXAM",
] as const;

export const historyQuerySchema = z
  .object({
    type: z.enum(HISTORY_TYPES).optional(),
    from: dateField.optional(),
    to: dateField.optional(),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to, {
    message: "La fecha final no puede ser anterior a la inicial",
    path: ["to"],
  });

export type CreateConsultationRequestDto = z.infer<typeof createConsultationRequestSchema>;
export type CreateVaccinationRequestDto = z.infer<typeof createVaccinationRequestSchema>;
export type CreateVaccineRequestDto = z.infer<typeof createVaccineRequestSchema>;
export type HistoryQueryDto = z.infer<typeof historyQuerySchema>;
export type CreateSurgeryRequestDto = z.infer<typeof createSurgeryRequestSchema>;
export type CreateHospitalizationRequestDto = z.infer<typeof createHospitalizationRequestSchema>;
export type DischargeHospitalizationRequestDto = z.infer<
  typeof dischargeHospitalizationRequestSchema
>;
export type ListHospitalizationsQueryDto = z.infer<typeof listHospitalizationsQuerySchema>;
export type CreateLabExamRequestDto = z.infer<typeof createLabExamRequestSchema>;

export type VaccineStatus = "UP_TO_DATE" | "DUE_SOON" | "OVERDUE"; // RN-49

export interface ConsultationResponseDto {
  id: string;
  appointmentId: string;
  patientId: string;
  veterinarian: { id: string; firstNames: string; lastNames: string };
  symptoms: string;
  weightKg: number;
  temperatureC: number;
  diagnosis: string;
  treatment: string;
  prescription: string | null;
  internalNotes?: string | null;
  cost: number;
  createdAt: Date;
}

export interface VaccinationResponseDto {
  id: string;
  patientId: string;
  vaccine: { id: string; name: string };
  veterinarian: { id: string; firstNames: string; lastNames: string };
  lot: string;
  appliedAt: string;
  nextDoseAt: string | null;
  price: number;
  createdAt: Date;
}

export interface VaccineResponseDto {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

export interface SurgeryResponseDto {
  id: string;
  patientId: string;
  veterinarian: { id: string; firstNames: string; lastNames: string };
  procedure: string;
  performedAt: string;
  notes: string | null;
  createdAt: Date;
}

export type HospitalizationStatus = (typeof HOSPITALIZATION_STATUSES)[number];

export interface HospitalizationResponseDto {
  id: string;
  patientId: string;
  veterinarian: { id: string; firstNames: string; lastNames: string };
  reason: string;
  status: HospitalizationStatus;
  admittedAt: Date;
  dischargedAt: Date | null;
  dischargeNotes: string | null;
  createdAt: Date;
}

export interface LabExamResponseDto {
  id: string;
  patientId: string;
  veterinarian: { id: string; firstNames: string; lastNames: string };
  examType: string;
  performedAt: string;
  results: string;
  createdAt: Date;
}

export type HistoryEntryDto =
  | { kind: "CONSULTATION"; date: Date; consultation: ConsultationResponseDto }
  | { kind: "VACCINATION"; date: Date; vaccination: VaccinationResponseDto }
  | { kind: "SURGERY"; date: Date; surgery: SurgeryResponseDto }
  | { kind: "HOSPITALIZATION"; date: Date; hospitalization: HospitalizationResponseDto }
  | { kind: "LAB_EXAM"; date: Date; labExam: LabExamResponseDto };

export interface VaccinationCardEntryDto extends VaccinationResponseDto {
  status: VaccineStatus;
}
