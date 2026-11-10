import type { AppointmentType } from "@prisma/client";
import { CLINIC_TIME_ZONE } from "@/config/constants";
import { CLINIC_NAME, emailLayout } from "@/shared/utils/email-layout";
import { escapeHtml } from "@/shared/utils/html";

export interface EmailContent {
  subject: string;
  html: string;
}

export interface AppointmentEmailData {
  ownerName: string;
  patientName: string;
  type: AppointmentType;
  startsAt: Date;
  professional: string;
  reason: string | null;
  cancelReason: string | null;
}

export interface VaccineEmailData {
  ownerName: string;
  patientName: string;
  vaccineName: string;
  nextDoseAt: string; // AAAA-MM-DD
}

const TYPE_LABEL: Record<AppointmentType, string> = {
  GENERAL_CONSULTATION: "Consulta general",
  VACCINATION: "Vacunacion",
  CHECKUP: "Control",
  GROOMING: "Estetica",
};

const dateTime = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: CLINIC_TIME_ZONE,
});
const dateOnly = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "UTC" });

const row = (label: string, value: string) =>
  `<tr><td style="padding:2px 12px 2px 0;color:#666">${label}</td><td><strong>${escapeHtml(value)}</strong></td></tr>`;

function appointmentDetails(data: AppointmentEmailData): string {
  return `<table>${[
    row("Mascota", data.patientName),
    row("Servicio", TYPE_LABEL[data.type]),
    row("Cuando", dateTime.format(data.startsAt)),
    row("Atiende", data.professional),
    ...(data.reason ? [row("Motivo", data.reason)] : []),
  ].join("")}</table>`;
}

const greeting = (ownerName: string) => `<p>Hola, ${escapeHtml(ownerName)}.</p>`;

export const buildConfirmedEmail = (data: AppointmentEmailData): EmailContent => ({
  subject: `${CLINIC_NAME}: cita agendada para ${data.patientName}`,
  html: emailLayout(
    "Tu cita esta agendada",
    `${greeting(data.ownerName)}<p>Registramos esta cita:</p>${appointmentDetails(data)}<p>Si no puedes asistir, puedes reprogramarla o cancelarla desde tu cuenta.</p>`,
  ),
});

export const buildChangedEmail = (data: AppointmentEmailData): EmailContent => ({
  subject: `${CLINIC_NAME}: cita modificada para ${data.patientName}`,
  html: emailLayout(
    "Tu cita fue modificada",
    `${greeting(data.ownerName)}<p>Estos son los datos actualizados de tu cita:</p>${appointmentDetails(data)}`,
  ),
});

export const buildCancelledEmail = (data: AppointmentEmailData): EmailContent => ({
  subject: `${CLINIC_NAME}: cita cancelada de ${data.patientName}`,
  html: emailLayout(
    "Tu cita fue cancelada",
    `${greeting(data.ownerName)}<p>Se cancelo esta cita:</p>${appointmentDetails(data)}${
      data.cancelReason ? `<p>Motivo: ${escapeHtml(data.cancelReason)}</p>` : ""
    }<p>Puedes agendar una nueva cuando quieras.</p>`,
  ),
});

export const buildReminderEmail = (data: AppointmentEmailData): EmailContent => ({
  subject: `${CLINIC_NAME}: recordatorio de la cita de ${data.patientName}`,
  html: emailLayout(
    "Te recordamos tu cita",
    `${greeting(data.ownerName)}<p>Tu cita es en las proximas 24 horas:</p>${appointmentDetails(data)}<p>Si no puedes asistir, avisanos para liberar la franja.</p>`,
  ),
});

export const buildVaccineDueEmail = (data: VaccineEmailData): EmailContent => ({
  subject: `${CLINIC_NAME}: proxima vacuna de ${data.patientName}`,
  html: emailLayout(
    "Se acerca una vacuna",
    `${greeting(data.ownerName)}<p>La proxima dosis de <strong>${escapeHtml(data.vaccineName)}</strong> de <strong>${escapeHtml(data.patientName)}</strong> es el <strong>${dateOnly.format(new Date(`${data.nextDoseAt}T00:00:00.000Z`))}</strong>.</p><p>Agenda una cita de vacunacion desde tu cuenta.</p>`,
  ),
});
