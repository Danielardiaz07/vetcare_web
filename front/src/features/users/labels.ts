import type { StatusTone } from "@/components/ui/status-badge";
import type { UserStatus } from "@/types/auth";

export const STATUS_LABELS: Record<UserStatus, { label: string; tone: StatusTone }> = {
  ACTIVE: { label: "Activa", tone: "success" },
  SUSPENDED: { label: "Suspendida", tone: "danger" },
  PENDING: { label: "Pendiente", tone: "warning" },
};
