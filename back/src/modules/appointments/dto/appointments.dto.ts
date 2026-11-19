import { AppointmentStatus, AppointmentType, type LabExamStatus } from "@prisma/client";
import { z } from "zod";
import {
  AGENDA_MAX_DAYS,
  APPOINTMENT_INSTRUCTIONS_MAX,
  APPOINTMENT_TEXT_MAX,
  CHECK_IN_CODE_MAX,
  CHECK_IN_QR_EXTENSION,
  MANAGE_TOKEN_MAX,
  PROCEDURE_MAX_DURATION_MINUTES,
  PROCEDURE_NAME_MAX,
  SCANNER_TOKEN_MAX,
  SLOT_MINUTES,
} from "@/config/constants";
import { isProcedure } from "@/modules/appointments/procedures";
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

// D-71: la duración de una cirugía o un examen la fija cada cita, en múltiplos de la franja.
const durationField = z
  .number()
  .int("La duracion debe ser un numero entero de minutos")
  .min(SLOT_MINUTES, `La duracion minima es de ${SLOT_MINUTES} minutos`)
  .max(
    PROCEDURE_MAX_DURATION_MINUTES,
    `La duracion maxima es de ${PROCEDURE_MAX_DURATION_MINUTES} minutos`,
  )
  .refine(
    (value) => value % SLOT_MINUTES === 0,
    `La duracion es multiplo de ${SLOT_MINUTES} minutos`,
  );

const PROCEDURE_ONLY_MESSAGE = "Solo aplica a cirugias y examenes de laboratorio";

export const availabilityQuerySchema = z
  .object({
    type: z.enum(AppointmentType),
    date: clinicDateField,
    professionalId: z.uuid("Identificador invalido").optional(),
    durationMinutes: z.coerce.number().pipe(durationField).optional(),
  })
  .superRefine((query, ctx) => {
    if (isProcedure(query.type) && query.durationMinutes === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["durationMinutes"],
        message: "La duracion es obligatoria para cirugias y examenes",
      });
    }
    if (!isProcedure(query.type) && query.durationMinutes !== undefined) {
      ctx.addIssue({ code: "custom", path: ["durationMinutes"], message: PROCEDURE_ONLY_MESSAGE });
    }
  });

export const createAppointmentRequestSchema = z
  .object({
    patientId: z.uuid("Identificador invalido"),
    type: z.enum(AppointmentType),
    professionalId: z.uuid("Identificador invalido").optional(),
    startsAt: instantField,
    reason: textField("El motivo").min(1).optional(),
    procedureName: z
      .string()
      .trim()
      .min(1, "El procedimiento es obligatorio")
      .max(PROCEDURE_NAME_MAX, `El procedimiento admite maximo ${PROCEDURE_NAME_MAX} caracteres`)
      .optional(),
    durationMinutes: durationField.optional(),
    instructions: z
      .string()
      .trim()
      .min(1)
      .max(
        APPOINTMENT_INSTRUCTIONS_MAX,
        `Las indicaciones admiten maximo ${APPOINTMENT_INSTRUCTIONS_MAX} caracteres`,
      )
      .optional(),
  })
  .superRefine((dto, ctx) => {
    const procedureFields = ["procedureName", "durationMinutes", "instructions"] as const;
    if (isProcedure(dto.type)) {
      for (const field of ["procedureName", "durationMinutes"] as const) {
        if (dto[field] === undefined) {
          ctx.addIssue({ code: "custom", path: [field], message: "El campo es obligatorio" });
        }
      }
      return;
    }
    for (const field of procedureFields) {
      if (dto[field] !== undefined) {
        ctx.addIssue({ code: "custom", path: [field], message: PROCEDURE_ONLY_MESSAGE });
      }
    }
  });

export const rescheduleAppointmentRequestSchema = z.object({
  startsAt: instantField,
  professionalId: z.uuid("Identificador invalido").optional(),
  durationMinutes: durationField.optional(), // D-71: solo cirugía y examen; sin él se conserva la actual
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

// D-71: el registro clínico vinculado a la cita, cuando ya existe. `status` solo viene en el examen de laboratorio.
export type LinkedClinicalRecordDto =
  | { kind: "CONSULTATION" | "GROOMING" | "SURGERY"; id: string }
  | { kind: "LAB_EXAM"; id: string; status: LabExamStatus };

export interface AppointmentResponseDto {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  reason: string | null;
  cancelReason: string | null;
  procedureName: string | null; // solo cirugía y examen (D-71)
  instructions: string | null; // indicaciones para el propietario; solo cirugía y examen (D-71)
  clinicalRecord: LinkedClinicalRecordDto | null;
  attentionStartedAt: Date | null; // D-73
  patient: { id: string; name: string };
  professional: ProfessionalSummaryDto;
  owner?: { id: string; firstNames: string; lastNames: string; phone: string };
}
