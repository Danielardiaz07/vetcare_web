import { AppointmentStatus, AppointmentType } from "@prisma/client";
import { z } from "zod";
import {
  AGENDA_MAX_DAYS,
  APPOINTMENT_TEXT_MAX,
  CHECK_IN_CODE_MAX,
  CHECK_IN_QR_EXTENSION,
  MANAGE_TOKEN_MAX,
  SCANNER_TOKEN_MAX,
} from "@/config/constants";
import { paginationQuerySchema } from "@/shared/utils/pagination";
import { daysBetween, isValidClinicDate } from "@/shared/utils/clinic-time";

const clinicDateField = z.string().refine(isValidClinicDate, "Fecha invalida, usa AAAA-MM-DD");

const instantField = z.iso
  .datetime({ offset: true, error: "Fecha y hora invalidas" })
  .transform((value) => new Date(value));

const textField = (label: string) =>
  z
    .string()
    .trim()
    .max(APPOINTMENT_TEXT_MAX, `${label} admite maximo ${APPOINTMENT_TEXT_MAX} caracteres`);

export const availabilityQuerySchema = z.object({
  type: z.enum(AppointmentType),
  date: clinicDateField,
  professionalId: z.uuid("Identificador invalido").optional(),
});

export const createAppointmentRequestSchema = z.object({
  patientId: z.uuid("Identificador invalido"),
  type: z.enum(AppointmentType),
  professionalId: z.uuid("Identificador invalido").optional(),
  startsAt: instantField,
  reason: textField("El motivo").min(1).optional(),
});

export const rescheduleAppointmentRequestSchema = z.object({
  startsAt: instantField,
  professionalId: z.uuid("Identificador invalido").optional(),
});

export const cancelAppointmentRequestSchema = z.object({
  reason: textField("El motivo").min(1, "El motivo de la cancelacion es obligatorio"),
});

export const reassignAppointmentRequestSchema = z.object({
  professionalId: z.uuid("Identificador invalido"),
});

export const agendaQuerySchema = z
  .object({
    from: clinicDateField,
    to: clinicDateField.optional(),
    veterinarianId: z.uuid("Identificador invalido").optional(),
    groomerId: z.uuid("Identificador invalido").optional(),
    status: z.enum(AppointmentStatus).optional(),
  })
  .refine((query) => !query.to || daysBetween(query.from, query.to) >= 0, {
    message: "La fecha final no puede ser anterior a la inicial",
    path: ["to"],
  })
  .refine((query) => !query.to || daysBetween(query.from, query.to) < AGENDA_MAX_DAYS, {
    message: `El rango admite maximo ${AGENDA_MAX_DAYS} dias`,
    path: ["to"],
  });

export const checkInRequestSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "El codigo es obligatorio")
    .max(CHECK_IN_CODE_MAX, `El codigo admite maximo ${CHECK_IN_CODE_MAX} caracteres`),
});

export const scannerTokenParamSchema = z.object({
  scannerToken: z.string().trim().min(1).max(SCANNER_TOKEN_MAX),
});

export const checkInQrParamSchema = z.object({
  file: z
    .string()
    .trim()
    .min(1)
    .max(CHECK_IN_CODE_MAX + CHECK_IN_QR_EXTENSION.length),
});

export const manageTokenParamSchema = z.object({
  token: z.string().trim().min(1).max(MANAGE_TOKEN_MAX),
});

// RN-84: el motivo es opcional al cancelar desde el correo; sin él se usa uno por defecto.
export const cancelByLinkRequestSchema = z.object({
  reason: textField("El motivo").min(1).optional(),
});

export const APPOINTMENTS_WHEN = ["upcoming", "past"] as const;

export const listMyAppointmentsQuerySchema = paginationQuerySchema.extend({
  when: z.enum(APPOINTMENTS_WHEN).default("upcoming"),
});

export type AvailabilityQueryDto = z.infer<typeof availabilityQuerySchema>;
export type CreateAppointmentRequestDto = z.infer<typeof createAppointmentRequestSchema>;
export type RescheduleAppointmentRequestDto = z.infer<typeof rescheduleAppointmentRequestSchema>;
export type CancelAppointmentRequestDto = z.infer<typeof cancelAppointmentRequestSchema>;
export type ReassignAppointmentRequestDto = z.infer<typeof reassignAppointmentRequestSchema>;
export type AgendaQueryDto = z.infer<typeof agendaQuerySchema>;
export type ListMyAppointmentsQueryDto = z.infer<typeof listMyAppointmentsQuerySchema>;
export type CheckInRequestDto = z.infer<typeof checkInRequestSchema>;
export type CancelByLinkRequestDto = z.infer<typeof cancelByLinkRequestSchema>;

// D-65, RN-84: lo que ve quien abre el enlace del correo. Sin datos del propietario.
export interface ManagedAppointmentDto {
  appointment: AppointmentResponseDto;
  canChange: boolean; // false si la cita ya no está activa o faltan 2 horas o menos
  blockedReason: string | null; // el motivo, listo para mostrar, cuando canChange es false
}

// D-56, RN-83: lo que el propietario muestra en recepción el día de la cita.
export interface CheckInCodeResponseDto {
  appointmentId: string;
  code: string;
  qrSvg: string; // el QR del código, ya dibujado
  startsAt: Date;
}

// D-66, RN-85: lo que muestra la página de escaneo al registrar la llegada; solo lo necesario para confirmar.
export interface CheckInScanResultDto {
  patientName: string;
  startsAt: Date;
}

// D-68, RN-85: el acceso de recepción a la página de escaneo, con su QR fijo ya dibujado.
export interface ScannerAccessResponseDto {
  url: string;
  qrSvg: string;
}

export interface ProfessionalSummaryDto {
  id: string;
  firstNames: string;
  lastNames: string;
}

export interface AvailableSlotDto {
  startsAt: Date;
  endsAt: Date;
  professionals: ProfessionalSummaryDto[];
}

export interface AvailabilityResponseDto {
  date: string;
  durationMinutes: number;
  slots: AvailableSlotDto[];
  suggestedDates: string[];
}

export interface AppointmentResponseDto {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
  cancelReason: string | null;
  patient: { id: string; name: string };
  professional: ProfessionalSummaryDto;
  owner?: { id: string; firstNames: string; lastNames: string; phone: string };
}
