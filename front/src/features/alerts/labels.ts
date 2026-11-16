import type { IconName } from "@/components/ui/icon";
import { clinicDateOf, formatClinicTime } from "@/lib/clinic-time";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { AlertKind, PortalAlert } from "@/types/alerts";

export const ALERT_LABELS: Record<AlertKind, { label: string; icon: IconName; color: string }> = {
  APPOINTMENT_UPCOMING: { label: "Cita próxima", icon: "calendar", color: "text-brand-600" },
  VACCINE_DUE: { label: "Vacuna por vencer", icon: "syringe", color: "text-warning" },
  VACCINE_OVERDUE: { label: "Vacuna vencida", icon: "alert", color: "text-danger" },
  WEIGHT_CHANGE: { label: "Cambio de peso", icon: "chart", color: "text-warning" },
  INVOICE_NEW: { label: "Nueva factura", icon: "receipt", color: "text-brand-600" },
};

export function alertHref(alert: PortalAlert): string {
  if (alert.appointmentId) {
    return `${ROUTES.portalAppointments}?appointmentId=${encodeURIComponent(alert.appointmentId)}`;
  }
  if (alert.invoiceId) {
    return `${ROUTES.portalInvoices}?invoiceId=${encodeURIComponent(alert.invoiceId)}`;
  }
  if (alert.patientId) return ROUTES.portalPetHistory(alert.patientId);
  return ROUTES.portal;
}

export function alertDate(alert: PortalAlert): string {
  const date =
    alert.date.length === "AAAA-MM-DD".length ? alert.date : clinicDateOf(new Date(alert.date));
  const formatted = formatDate(date);
  return alert.kind === "APPOINTMENT_UPCOMING"
    ? `${formatted} · ${formatClinicTime(alert.date)}`
    : formatted;
}
