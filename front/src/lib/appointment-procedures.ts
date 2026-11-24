import { SLOT_MINUTES } from "@/features/staff/labels";
import type {
  Appointment,
  AppointmentType,
  LabExamStatus,
  ProcedureAppointmentType,
} from "@/types/domain";

export const PROCEDURE_TYPES = ["SURGERY", "LAB_EXAM"] as const;
export const PROCEDURE_NAME_MAX = 80;
export const PROCEDURE_INSTRUCTIONS_MAX = 500;
const MINUTES_PER_HOUR = 60;
const MAX_PROCEDURE_MINUTES = 480;

export function formatDurationInput(value: string, pasted = false): string {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  const padded = pasted && /^\d:\d{2}$/.test(raw) ? `0${digits}` : digits;
  return padded.length > 2 ? `${padded.slice(0, 2)}:${padded.slice(2)}` : padded;
}

export function parseProcedureDuration(value: string): number | undefined {
  const parts = /^(\d{1,2}):([0-5]\d)$/.exec(value.trim());
  if (!parts) return undefined;
  const minutes = Number(parts[1]) * MINUTES_PER_HOUR + Number(parts[2]);
  if (minutes < SLOT_MINUTES || minutes > MAX_PROCEDURE_MINUTES || minutes % SLOT_MINUTES !== 0) {
    return undefined;
  }
  return minutes;
}

export function formatProcedureDuration(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function isProcedureAppointment(type: AppointmentType): type is ProcedureAppointmentType {
  return type === "SURGERY" || type === "LAB_EXAM";
}

export const LAB_EXAM_STATUS = {
  PENDING_RESULTS: { label: "En espera de resultados", tone: "warning" },
  WITH_RESULTS: { label: "Con resultados", tone: "success" },
} as const satisfies Record<LabExamStatus, { label: string; tone: string }>;

export function appointmentLabStatus({ clinicalRecord }: Appointment) {
  return clinicalRecord?.kind === "LAB_EXAM" ? LAB_EXAM_STATUS[clinicalRecord.status] : null;
}
