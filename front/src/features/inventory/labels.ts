import type { StatusTone } from "@/components/ui/status-badge";
import { FIELD_LIMITS } from "@/lib/constants";
import type { InventoryItem, InventoryKind } from "@/types/domain";

export const INVENTORY_TABS: { kind: InventoryKind; label: string }[] = [
  { kind: "MEDICATION", label: "Medicamentos" },
  { kind: "VACCINE", label: "Vacunas" },
];

export const KIND_LABELS: Record<InventoryKind, { singular: string; plural: string }> = {
  MEDICATION: { singular: "medicamento", plural: "medicamentos" },
  VACCINE: { singular: "vacuna", plural: "vacunas" },
};

// Mismo tope que la columna del nombre en cada tabla (D-36).
export const NAME_MAX: Record<InventoryKind, number> = {
  MEDICATION: FIELD_LIMITS.MEDICATION_NAME_MAX,
  VACCINE: FIELD_LIMITS.VACCINE_NAME_MAX,
};

export type InventoryBadge = { label: string; tone: StatusTone };

// RN-56: un producto inactivo no genera alertas; uno activo puede tener varias a la vez.
export function inventoryBadges(item: InventoryItem): InventoryBadge[] {
  if (!item.active) return [{ label: "Inactivo", tone: "neutral" }];
  const badges: InventoryBadge[] = [];
  if (item.lowStock) badges.push({ label: "Stock crítico", tone: "danger" });
  if (item.expiry === "EXPIRING") badges.push({ label: "Por vencer", tone: "warning" });
  if (item.expiry === "EXPIRED") badges.push({ label: "Vencido", tone: "danger" });
  return badges.length > 0 ? badges : [{ label: "Disponible", tone: "success" }];
}
