import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { KIND_LABELS } from "@/features/inventory/labels";
import type { InventoryAlertFilter } from "@/services/inventory";
import type { InventoryAlerts, InventoryKind } from "@/types/domain";

type InventoryAlertsSummaryProps = {
  kind: InventoryKind;
  alerts: InventoryAlerts;
  filter: InventoryAlertFilter | undefined;
  onFilter: (filter: InventoryAlertFilter | undefined) => void;
};

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

// RN-56: conteos de la pestaña abierta; el filtro "por vencer" de la API incluye los vencidos.
export function InventoryAlertsSummary({
  kind,
  alerts,
  filter,
  onFilter,
}: InventoryAlertsSummaryProps) {
  const ofKind = alerts.items.filter((alert) => alert.kind === kind);
  const lowStock = ofKind.filter((alert) => alert.reasons.includes("LOW_STOCK")).length;
  const expiring = ofKind.filter((alert) =>
    alert.reasons.some((reason) => reason === "EXPIRING" || reason === "EXPIRED"),
  ).length;
  const expired = ofKind.filter((alert) => alert.reasons.includes("EXPIRED")).length;
  const label = KIND_LABELS[kind].plural;

  if (lowStock === 0 && expiring === 0) {
    return (
      <p className="flex items-center gap-2 rounded-card border border-success-border bg-success-bg px-4 py-3 text-success">
        <Icon name="shield" className="size-5 shrink-0" />
        Ningún {KIND_LABELS[kind].singular} activo está en stock crítico ni por vencer.
      </p>
    );
  }

  const cards: {
    filter: InventoryAlertFilter;
    count: number;
    title: string;
    detail: string;
  }[] = [
    {
      filter: "LOW_STOCK",
      count: lowStock,
      title: `${plural(lowStock, "producto", "productos")} en stock crítico`,
      detail: "Stock igual o menor al mínimo",
    },
    {
      filter: "EXPIRING",
      count: expiring,
      title: `${plural(expiring, "producto", "productos")} por vencer`,
      detail:
        `Vencen en los próximos ${alerts.expiringDays} días` +
        (expired > 0 ? ` (${plural(expired, "ya vencido", "ya vencidos")})` : ""),
    },
  ];

  return (
    <section aria-label={`Alertas de ${label}`} className="grid gap-3 sm:grid-cols-2">
      {cards.map((card) => {
        const selected = filter === card.filter;
        return (
          <div
            key={card.filter}
            className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning-border bg-warning-bg px-4 py-3"
          >
            <div className="flex min-w-0 items-start gap-3">
              <Icon name="alert" className="mt-0.5 size-5 shrink-0 text-warning" />
              <div className="min-w-0">
                <p className="font-semibold text-ink">{card.title}</p>
                <p className="text-sm text-muted">{card.detail}</p>
              </div>
            </div>
            {card.count > 0 && (
              <Button
                variant="secondary"
                aria-pressed={selected}
                onClick={() => onFilter(selected ? undefined : card.filter)}
              >
                {selected ? "Ver todos" : "Ver solo estos"}
              </Button>
            )}
          </div>
        );
      })}
    </section>
  );
}
