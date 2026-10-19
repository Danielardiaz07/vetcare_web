import type { StatusTone } from "@/components/ui/status-badge";
import type { VaccineStatus } from "@/types/domain";

// RN-49: el estado de la vacuna se muestra con su color.
export const VACCINE_STATUS: Record<VaccineStatus, { label: string; tone: StatusTone }> = {
  UP_TO_DATE: { label: "Al día", tone: "success" },
  DUE_SOON: { label: "Vence pronto", tone: "warning" },
  OVERDUE: { label: "Vencida", tone: "danger" },
};

// Las vacunas por vencer o vencidas generan el aviso del portal.
export const needsVaccineAlert = (status: VaccineStatus) => status !== "UP_TO_DATE";
