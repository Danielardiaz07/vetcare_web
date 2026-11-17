"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/components/ui/cn";
import { clinicDateOf } from "@/lib/clinic-time";
import { formatDate } from "@/lib/format";
import type { WeightTrend } from "@/types/domain";

const PLOT_INSET = 4;
const PLOT_RANGE = 100 - PLOT_INSET * 2;
const GRID_LINES = 5;
const TOOLTIP_EDGE_GAP = 4;
const TOOLTIP_POINTER_INSET = 10;
const TOOLTIP_BORDER_OVERLAP = 1;
const POINT_CLEARANCE = 14;
const POINTER_BASE_WIDTH = 6;
const POINTER_POINT_GAP = 2;
const POINTER_MIN_LENGTH = 10;
const TOOLTIP_GAP = POINT_CLEARANCE + POINTER_POINT_GAP + POINTER_MIN_LENGTH;
const weightFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });

type PlotPoint = { x: number; y: number };
type TooltipPosition = {
  left: number;
  top: number;
  pointerPath: string;
};

function distanceToSegment(point: PlotPoint, start: PlotPoint, end: PlotPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const squaredLength = dx * dx + dy * dy;
  const fraction =
    squaredLength > 0
      ? Math.max(
          0,
          Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / squaredLength),
        )
      : 0;
  return Math.hypot(point.x - start.x - fraction * dx, point.y - start.y - fraction * dy);
}

type WeightChartProps = {
  points: WeightTrend["points"];
  flagged: boolean;
  patientName: string;
};

export function WeightChart({ points, flagged, patientName }: WeightChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const pointRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tooltipId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    function dismissOutside(event: PointerEvent | FocusEvent) {
      if (!chartRef.current?.contains(event.target as Node)) setSelectedId(null);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
    }
    document.addEventListener("pointerdown", dismissOutside);
    document.addEventListener("focusin", dismissOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      document.removeEventListener("focusin", dismissOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [selectedId]);

  useLayoutEffect(() => {
    const plot = plotRef.current;
    const tooltip = tooltipRef.current;
    const chart = chartRef.current;
    const index = points.findIndex((point) => point.consultationId === selectedId);
    const anchorButton = pointRefs.current[index];
    if (!plot || !tooltip || !chart || !anchorButton) return;

    const updateTooltipPosition = () => {
      const bounds = plot.getBoundingClientRect();
      const size = tooltip.getBoundingClientRect();
      const gap = TOOLTIP_GAP;
      const anchor = anchorButton.getBoundingClientRect();
      const previous = chart.previousElementSibling?.getBoundingClientRect();
      const contentTop = previous?.bottom ?? chart.getBoundingClientRect().top;
      const minimumTop = Math.min(0, contentTop + TOOLTIP_EDGE_GAP - bounds.top);
      const x = anchor.left + anchor.width / 2 - bounds.left;
      const y = anchor.top + anchor.height / 2 - bounds.top;
      const markers = pointRefs.current.slice(0, points.length).flatMap((button) => {
        if (!button) return [];
        const rect = button.getBoundingClientRect();
        return [
          {
            x: rect.left + rect.width / 2 - bounds.left,
            y: rect.top + rect.height / 2 - bounds.top,
          },
        ];
      });

      function bounded(left: number, top: number) {
        return {
          left: Math.max(0, Math.min(left, bounds.width - size.width)),
          top: Math.max(minimumTop, Math.min(top, bounds.height - size.height)),
        };
      }
      function withPointer(candidate: { left: number; top: number }) {
        const dx = x - candidate.left - size.width / 2;
        const dy = y - candidate.top - size.height / 2;
        const verticalEdge = Math.abs(dx) * size.height > Math.abs(dy) * size.width;
        const edgeLength = verticalEdge ? size.height : size.width;
        const inset = Math.min(TOOLTIP_POINTER_INSET + POINTER_BASE_WIDTH / 2, edgeLength / 2);
        const rawOffset = verticalEdge ? y - candidate.top : x - candidate.left;
        const offset = Math.max(inset, Math.min(rawOffset, edgeLength - inset));
        let base: PlotPoint;
        let baseStart: PlotPoint;
        let baseEnd: PlotPoint;
        if (verticalEdge) {
          base = {
            x:
              candidate.left +
              (dx > 0 ? size.width - TOOLTIP_BORDER_OVERLAP : TOOLTIP_BORDER_OVERLAP),
            y: candidate.top + offset,
          };
          baseStart = { x: base.x, y: base.y - POINTER_BASE_WIDTH / 2 };
          baseEnd = { x: base.x, y: base.y + POINTER_BASE_WIDTH / 2 };
        } else {
          base = {
            x: candidate.left + offset,
            y:
              candidate.top +
              (dy > 0 ? size.height - TOOLTIP_BORDER_OVERLAP : TOOLTIP_BORDER_OVERLAP),
          };
          baseStart = { x: base.x - POINTER_BASE_WIDTH / 2, y: base.y };
          baseEnd = { x: base.x + POINTER_BASE_WIDTH / 2, y: base.y };
        }
        const length = Math.hypot(x - base.x, y - base.y);
        const scale =
          length > 0 ? Math.max(0, length - POINT_CLEARANCE - POINTER_POINT_GAP) / length : 0;
        return {
          ...candidate,
          pointer: {
            baseStart,
            baseEnd,
            tip: { x: base.x + (x - base.x) * scale, y: base.y + (y - base.y) * scale },
          },
        };
      }

      const above = y - size.height - gap;
      const below = y + gap;
      const candidates = [
        bounded(x - size.width / 2, above),
        bounded(x - size.width - gap, above),
        bounded(x + gap, above),
        bounded(x - size.width / 2, below),
        bounded(x - size.width - gap, below),
        bounded(x + gap, below),
        bounded(x - size.width - gap, y - size.height / 2),
        bounded(x + gap, y - size.height / 2),
        bounded(x - size.width / 2, minimumTop),
      ].map(withPointer);
      const placement =
        candidates.find((candidate) => {
          const { baseStart, baseEnd, tip } = candidate.pointer;
          return !markers.some((point) => {
            const coversBody =
              point.x >= candidate.left - POINT_CLEARANCE &&
              point.x <= candidate.left + size.width + POINT_CLEARANCE &&
              point.y >= candidate.top - POINT_CLEARANCE &&
              point.y <= candidate.top + size.height + POINT_CLEARANCE;
            const coversPointer =
              distanceToSegment(point, baseStart, tip) <= POINT_CLEARANCE ||
              distanceToSegment(point, tip, baseEnd) <= POINT_CLEARANCE ||
              distanceToSegment(point, baseEnd, baseStart) <= POINT_CLEARANCE;
            return coversBody || coversPointer;
          });
        }) ??
        withPointer({
          left: candidates[0]!.left,
          top: Math.min(minimumTop, -size.height - gap),
        });

      const { baseStart, baseEnd, tip } = placement.pointer;
      const pointerPath = `M ${baseStart.x} ${baseStart.y} L ${tip.x} ${tip.y} L ${baseEnd.x} ${baseEnd.y}`;

      setTooltipPosition((current) =>
        current?.left === placement.left &&
        current.top === placement.top &&
        current.pointerPath === pointerPath
          ? current
          : { left: placement.left, top: placement.top, pointerPath },
      );
    };

    updateTooltipPosition();
    const observer = new ResizeObserver(updateTooltipPosition);
    observer.observe(plot);
    observer.observe(tooltip);
    return () => observer.disconnect();
  }, [points, selectedId]);

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
  const selected = positions.find((point) => point.consultationId === selectedId);

  function selectMeasurement(event: MouseEvent<HTMLButtonElement>, index: number) {
    let selectedIndex = index;
    // Las áreas táctiles pueden cruzarse cuando dos consultas están muy próximas.
    if (event.detail > 0 && plotRef.current) {
      const bounds = plotRef.current.getBoundingClientRect();
      let shortestDistance = Infinity;
      positions.forEach((point, pointIndex) => {
        const distance = Math.hypot(
          event.clientX - bounds.left - (point.x / 100) * bounds.width,
          event.clientY - bounds.top - (point.y / 100) * bounds.height,
        );
        if (distance < shortestDistance) {
          shortestDistance = distance;
          selectedIndex = pointIndex;
        }
      });
    }
    setSelectedId(positions[selectedIndex]!.consultationId);
    pointRefs.current[selectedIndex]?.focus({ preventScroll: true });
  }

  return (
    <div ref={chartRef} className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] gap-x-2 gap-y-1">
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
      <div ref={plotRef} className="relative h-56 min-w-0">
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
        <div role="group" aria-label={`Mediciones de peso de ${patientName}`}>
          {positions.map((point, index) => {
            const latest = index === positions.length - 1;
            const active = point.consultationId === selected?.consultationId;
            return (
              <button
                key={point.consultationId}
                ref={(element) => {
                  pointRefs.current[index] = element;
                }}
                type="button"
                aria-label={`${formatDate(clinicDateOf(new Date(point.date)))} · ${weightFormatter.format(point.weightKg)} kg`}
                aria-pressed={active}
                aria-describedby={active ? tooltipId : undefined}
                onClick={(event) => selectMeasurement(event, index)}
                onFocus={() => setSelectedId(point.consultationId)}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                className="group absolute z-30 inline-flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "group-hover:ring-4 group-hover:ring-brand-200",
                    latest ? "size-3" : "size-2",
                    latest && flagged
                      ? "rotate-45 rounded-xs bg-warning"
                      : "rounded-full bg-brand-600",
                    active ? "ring-4 ring-brand-200" : "ring-2 ring-surface",
                  )}
                />
              </button>
            );
          })}
        </div>
        {selected && (
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            style={{
              left: tooltipPosition?.left ?? 0,
              top: tooltipPosition?.top ?? 0,
              visibility: tooltipPosition ? "visible" : "hidden",
            }}
            className="pointer-events-none absolute z-20 flex w-max max-w-full flex-wrap items-center gap-x-3 gap-y-0.5 rounded-control border border-brand-200 bg-brand-50 px-2.5 py-0.5"
          >
            <time
              dateTime={selected.date}
              className="text-xs leading-4 whitespace-nowrap text-muted"
            >
              {formatDate(clinicDateOf(new Date(selected.date)))}
            </time>
            <span className="text-sm leading-4 font-semibold whitespace-nowrap text-brand-700 tabular-nums">
              {weightFormatter.format(selected.weightKg)} kg
            </span>
          </div>
        )}
        {selected && tooltipPosition && (
          <svg
            aria-hidden="true"
            focusable="false"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
          >
            <path d={`${tooltipPosition.pointerPath} Z`} className="fill-brand-50" />
            <path
              d={tooltipPosition.pointerPath}
              fill="none"
              strokeWidth={1}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-brand-200"
            />
          </svg>
        )}
      </div>
      <span />
      <div aria-hidden="true" className="flex justify-between gap-2 text-xs text-subtle">
        <span>{formatDate(clinicDateOf(new Date(first.date)))}</span>
        <span className="text-right">{formatDate(clinicDateOf(new Date(last.date)))}</span>
      </div>
      <p className="col-span-2 mt-2 text-sm text-muted">
        Selecciona un punto para ver su fecha y peso.
      </p>
    </div>
  );
}
