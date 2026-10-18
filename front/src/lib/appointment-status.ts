import type { StatusTone } from "@/components/ui/status-badge";
import type { AppointmentStatus } from "@/types/domain";

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: StatusTone }> = {
  SCHEDULED: { label: "Programada", tone: "info" },
  CONFIRMED: { label: "Confirmada", tone: "success" },
  ATTENDED: { label: "Atendida", tone: "neutral" },
  CANCELLED: { label: "Cancelada", tone: "danger" },
  NO_SHOW: { label: "No asistió", tone: "warning" },
};
