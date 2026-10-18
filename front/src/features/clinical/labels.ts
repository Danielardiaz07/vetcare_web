import type { StatusTone } from "@/components/ui/status-badge";
import type { VaccineStatus } from "@/types/domain";

// RN-49: el estado de la vacuna se muestra con su color.
export const VACCINE_STATUS: Record<VaccineStatus, { label: string; tone: StatusTone }> = {
  UP_TO_DATE: { label: "Al día", tone: "success" },
  DUE_SOON: { label: "Próxima a vencer", tone: "warning" },
  OVERDUE: { label: "Vencida", tone: "danger" },
};
