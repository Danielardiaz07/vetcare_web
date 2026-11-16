import { clinicDateOf } from "@/lib/clinic-time";
import { formatDate } from "@/lib/format";
import type { WeightTrend } from "@/types/domain";

const PLOT_INSET = 4;
const PLOT_RANGE = 100 - PLOT_INSET * 2;
const GRID_LINES = 5;
const weightFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

type WeightChartProps = {
  points: WeightTrend["points"];
  flagged: boolean;
  patientName: string;
};

export function WeightChart({ points, flagged, patientName }: WeightChartProps) {
  if (points.length < 2) {
    return <p className="text-muted">Aún no hay suficientes consultas para graficar.</p>;
  }

  const weights = points.map((point) => point.weightKg);
  const minimum = Math.min(...weights);
  const maximum = Math.max(...weights);
  const padding = Math.max((maximum - minimum) * 0.15, 0.1);
  const lower = Math.max(0, minimum - padding);
  const upper = maximum + padding;
  const first = points[0]!;
  const last = points.at(-1)!;
  const start = new Date(first.date).getTime();
  const end = new Date(last.date).getTime();
  const positions = points.map((point, index) => ({
    ...point,
    x:
      PLOT_INSET +
      (end > start
        ? (new Date(point.date).getTime() - start) / (end - start)
        : index / (points.length - 1)) *
        PLOT_RANGE,
    y: PLOT_INSET + ((upper - point.weightKg) / (upper - lower)) * PLOT_RANGE,
  }));
  const ticks = Array.from(
    { length: GRID_LINES },
    (_, index) => upper - ((upper - lower) * index) / (GRID_LINES - 1),
  );

  return (
    <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 gap-y-1">
      <span aria-hidden="true" className="text-right text-xs text-subtle">
        kg
      </span>
      <span />
      <div
        aria-hidden="true"
        className="flex h-56 flex-col justify-between py-1 text-right text-xs text-subtle tabular-nums"
      >
        {ticks.map((tick, index) => (
          <span key={index}>{weightFormatter.format(tick)}</span>
        ))}
      </div>
      <div className="relative h-56 min-w-0">
        <svg
          role="img"
          aria-label={`Evolución del peso de ${patientName}, ${points.length} mediciones. Último peso: ${weightFormatter.format(last.weightKg)} kg${flagged ? ". Cambio de peso marcado para revisión" : ""}. Los valores completos están en los registros de peso.`}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
        >
          {ticks.map((_, index) => {
            const y = PLOT_INSET + (index / (GRID_LINES - 1)) * PLOT_RANGE;
            return (
              <line
                key={index}
                x1={PLOT_INSET}
                x2={100 - PLOT_INSET}
                y1={y}
                y2={y}
                vectorEffect="non-scaling-stroke"
                className="stroke-line"
              />
            );
          })}
          <polyline
            points={positions.map((point) => `${point.x},${point.y}`).join(" ")}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className="stroke-brand-600"
          />
        </svg>
        <div aria-hidden="true">
          {positions.map((point, index) => {
            const latest = index === positions.length - 1;
            return (
              <span
                key={point.consultationId}
                title={`${formatDate(clinicDateOf(new Date(point.date)))} · ${weightFormatter.format(point.weightKg)} kg`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 ring-2 ring-surface ${latest ? "size-3" : "size-2"} ${latest && flagged ? "rotate-45 rounded-xs bg-warning" : "rounded-full bg-brand-600"}`}
              />
            );
          })}
        </div>
      </div>
      <span />
      <div aria-hidden="true" className="flex justify-between gap-2 text-xs text-subtle">
        <span>{formatDate(clinicDateOf(new Date(first.date)))}</span>
        <span className="text-right">{formatDate(clinicDateOf(new Date(last.date)))}</span>
      </div>
    </div>
  );
}
