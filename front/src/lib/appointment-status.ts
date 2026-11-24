import type { StatusTone } from "@/components/ui/status-badge";
import type { Appointment, AppointmentStatus } from "@/types/domain";

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: "Programada", tone: "info" },
  CONFIRMED: { label: "Confirmada", tone: "success" },
  ATTENDED: { label: "Atendida", tone: "neutral" },
  CANCELLED: { label: "Cancelada", tone: "danger" },
  NO_SHOW: { label: "No asistió", tone: "warning" },
};

export function appointmentInProgressLabel({ status, attentionStartedAt, type }: Appointment) {
  if (status !== "CONFIRMED" || !attentionStartedAt || type === "GROOMING") return null;
  if (type === "SURGERY") return "En cirugía";
  if (type === "LAB_EXAM") return "En atención";
  return "En consultorio";
}
