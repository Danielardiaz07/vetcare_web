import type { AppointmentType } from "@prisma/client";
import { CLINIC_TIME_ZONE } from "@/config/constants";
import { isProcedure } from "@/modules/appointments/procedures";
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
  procedureName: string | null; // D-71: solo cirugía y examen
  instructions: string | null; // D-71: indicaciones para el propietario
  manageUrl: string; // enlace personal para cambiar o cancelar la cita (RN-84)
  checkInQrUrl: string | null; // imagen del QR de llegada (D-66, RN-83); null si la API no tiene dirección pública
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
  SURGERY: "Cirugia",
  LAB_EXAM: "Examen de laboratorio",
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
    row(
      "Servicio",
      data.procedureName
        ? `${TYPE_LABEL[data.type]}: ${data.procedureName}`
        : TYPE_LABEL[data.type],
    ),
    row("Cuando", dateTime.format(data.startsAt)),
    row("Atiende", data.professional),
    ...(data.reason ? [row("Motivo", data.reason)] : []),
  ].join("")}</table>`;
}

const greeting = (ownerName: string) => `<p>Hola, ${escapeHtml(ownerName)}.</p>`;

// D-71: lo que el propietario debe hacer antes del procedimiento (p. ej. ayuno); recepción lo escribe al agendar.
const instructionsBlock = (data: AppointmentEmailData) =>
  data.instructions ? `<p><strong>Indicaciones:</strong> ${escapeHtml(data.instructions)}</p>` : "";

// RN-84: el enlace abre una página con la cita; cambiarla o cancelarla es un paso aparte, así un programa que revise
// los enlaces del correo no cancela nada. D-71: las cirugías y los exámenes solo los cambia la clínica.
const manageBlock = (data: AppointmentEmailData) =>
  isProcedure(data.type)
    ? `<p>Para reprogramar o cancelar esta cita, comunicate con la clinica.</p>`
    : `<p><a href="${escapeHtml(data.manageUrl)}" style="display:inline-block;padding:10px 16px;background:#0f5c63;color:#fff;border-radius:8px;text-decoration:none">Reprogramar o cancelar mi cita</a></p><p style="color:#666;font-size:12px">Este enlace es personal: quien lo tenga puede cambiar o cancelar la cita. No lo compartas.</p>`;

// D-66, RN-83: con este QR recepción registra la llegada. Si la cita se reprograma, el de este correo deja de servir.
const checkInQrBlock = (qrUrl: string | null) =>
  qrUrl
    ? `<p style="text-align:center"><img src="${escapeHtml(qrUrl)}" alt="QR de llegada" width="180" height="180" style="border:0"></p><p style="text-align:center;color:#666;font-size:12px">Muestra este QR en recepcion al llegar y registramos tu llegada al instante. Tambien lo encuentras en Mis citas. Si cambias la cita, usa el QR nuevo.</p>`
    : "";

export const buildConfirmedEmail = (data: AppointmentEmailData): EmailContent => ({
  subject: `${CLINIC_NAME}: cita agendada para ${data.patientName}`,
  html: emailLayout(
    "Tu cita esta agendada",
    `${greeting(data.ownerName)}<p>Registramos esta cita:</p>${appointmentDetails(data)}${instructionsBlock(data)}${
      isProcedure(data.type)
        ? ""
        : "<p>Si no puedes asistir, puedes reprogramarla o cancelarla desde tu cuenta o con este enlace:</p>"
    }${manageBlock(data)}`,
  ),
});

export const buildChangedEmail = (data: AppointmentEmailData): EmailContent => ({
  subject: `${CLINIC_NAME}: cita modificada para ${data.patientName}`,
  html: emailLayout(
    "Tu cita fue modificada",
    `${greeting(data.ownerName)}<p>Estos son los datos actualizados de tu cita:</p>${appointmentDetails(data)}${instructionsBlock(data)}${manageBlock(data)}`,
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
    `${greeting(data.ownerName)}<p>Tu cita es en las proximas 24 horas:</p>${appointmentDetails(data)}${instructionsBlock(data)}${checkInQrBlock(data.checkInQrUrl)}${
      isProcedure(data.type)
        ? ""
        : "<p>Si no puedes asistir, reprogramala o cancelala para liberar la franja:</p>"
    }${manageBlock(data)}`,
  ),
});

export const buildVaccineDueEmail = (data: VaccineEmailData): EmailContent => ({
  subject: `${CLINIC_NAME}: proxima vacuna de ${data.patientName}`,
  html: emailLayout(
    "Se acerca una vacuna",
    `${greeting(data.ownerName)}<p>La proxima dosis de <strong>${escapeHtml(data.vaccineName)}</strong> de <strong>${escapeHtml(data.patientName)}</strong> es el <strong>${dateOnly.format(new Date(`${data.nextDoseAt}T00:00:00.000Z`))}</strong>.</p><p>Agenda una cita de vacunacion desde tu cuenta.</p>`,
  ),
});
