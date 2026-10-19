import { z } from "zod";
import { ClinicalLimit, FieldLimit, MONEY_DECIMALS, MONEY_MAX } from "@/config/constants";
import { isValidClinicDate } from "@/shared/utils/clinic-time";

const dateField = z.string().refine(isValidClinicDate, "Fecha invalida, usa AAAA-MM-DD");

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio`)
    .max(max, `${label} admite maximo ${max} caracteres`);

const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} admite maximo ${max} caracteres`).optional();

export const moneyField = z
  .number()
  .min(0, "El valor no puede ser negativo")
  .max(MONEY_MAX)
  .refine(
    (value) => Math.round(value * 10 ** MONEY_DECIMALS) / 10 ** MONEY_DECIMALS === value,
    `Maximo ${MONEY_DECIMALS} decimales`,
  );

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

export const HISTORY_TYPES = ["CONSULTATION", "VACCINATION"] as const;

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

export type HistoryEntryDto =
  | { kind: "CONSULTATION"; date: Date; consultation: ConsultationResponseDto }
  | { kind: "VACCINATION"; date: Date; vaccination: VaccinationResponseDto };

export interface VaccinationCardEntryDto extends VaccinationResponseDto {
  status: VaccineStatus;
}
