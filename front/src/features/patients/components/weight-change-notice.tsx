import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import type { WeightTrend } from "@/types/domain";

const percentFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

export function WeightChangeNotice({ change }: { change: WeightTrend["change"] }) {
  if (!change) return null;
  return (
    <div className="flex flex-col items-start gap-2">
      <StatusBadge tone={change.flagged ? "warning" : "neutral"}>
        <span className="inline-flex items-center gap-1.5">
          {change.flagged && <Icon name="alert" className="size-4 shrink-0" />}
          {percentFormatter.format(change.percent)} % frente a la consulta anterior
        </span>
      </StatusBadge>
      {change.flagged && (
        <p className="text-sm text-muted">Conviene revisarlo en la próxima consulta.</p>
      )}
    </div>
  );
}
