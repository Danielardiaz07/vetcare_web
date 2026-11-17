"use client";

import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { revenueDays } from "@/features/reports/dashboard-data";
import { clinicDateOf, dayParts, daysBetween } from "@/lib/clinic-time";
import { formatCop, formatDate } from "@/lib/format";
import type { DashboardReport } from "@/types/domain";

const CHART_HEIGHT = 224;
const CHART_PADDING = 12;
const TICK_COUNT = 5;
const axisFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
});

type RevenueChartProps = {
  range: DashboardReport["range"];
  revenue: DashboardReport["revenue"]["byDay"];
};

export function RevenueChart({ range, revenue }: RevenueChartProps) {
  const days = useMemo(() => revenueDays(range, revenue), [range, revenue]);
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.max(0, Math.min(days.length - 1, daysBetween(range.from, clinicDateOf(new Date())))),
  );
  const maximum = Math.max(0, ...days.map((day) => day.total));
  const index = Math.min(selectedIndex, days.length - 1);
  const selected = days[index];
  const plotWidth = Math.max(1, width - CHART_PADDING * 2);
  const plotHeight = CHART_HEIGHT - CHART_PADDING * 2;
  const ceiling = maximum > 0 ? maximum * 1.1 : 1;
  const xAt = (point: number) =>
    days.length === 1 ? width / 2 : CHART_PADDING + (point / (days.length - 1)) * plotWidth;
  const yAt = (value: number) => CHART_PADDING + (1 - value / ceiling) * plotHeight;
  const ticks = Array.from(
    { length: TICK_COUNT },
    (_, tick) => (ceiling * (TICK_COUNT - 1 - tick)) / (TICK_COUNT - 1),
  );
  const line = days
    .map((day, point) => `${point === 0 ? "M" : "L"}${xAt(point)},${yAt(day.total)}`)
    .join(" ");

  useLayoutEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;
    const measure = () => setWidth(Math.max(1, plot.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(plot);
    return () => observer.disconnect();
  }, [maximum]);

  function selectAt(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - bounds.left - CHART_PADDING) / plotWidth;
    setSelectedIndex(
      Math.max(0, Math.min(days.length - 1, Math.round(fraction * (days.length - 1)))),
    );
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    let next = index;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next++;
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next--;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = days.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setSelectedIndex(Math.max(0, Math.min(days.length - 1, next)));
  }

  if (!selected || maximum === 0) {
    return <p className="text-sm text-muted">No hay ingresos registrados en este periodo.</p>;
  }
  const dateTicks =
    days.length === 1 ? [0] : [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">{formatDate(selected.date)}</span>
        <span className="font-semibold text-brand-700 tabular-nums">
          {formatCop(selected.total)}
        </span>
      </div>
      <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-y-2">
        <div
          aria-hidden="true"
          className="relative text-xs text-muted tabular-nums"
          style={{ height: CHART_HEIGHT }}
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-3 -translate-y-1/2"
              style={{ top: yAt(tick) }}
            >
              {axisFormatter.format(tick)}
            </span>
          ))}
        </div>
        <div
          ref={plotRef}
          role="slider"
          aria-label="Ingresos por día"
          aria-valuemin={1}
          aria-valuemax={days.length}
          aria-valuenow={index + 1}
          aria-valuetext={`${formatDate(selected.date)}, ${formatCop(selected.total)}`}
          aria-orientation="horizontal"
          tabIndex={0}
          onKeyDown={handleKey}
          onPointerDown={(event) => {
            selectAt(event);
            event.currentTarget.focus({ preventScroll: true });
          }}
          onPointerMove={(event) => {
            if (event.pointerType === "mouse" || event.buttons > 0) selectAt(event);
          }}
          className="min-w-0 touch-pan-y rounded-xs"
          style={{ height: CHART_HEIGHT }}
        >
          <svg
            aria-hidden="true"
            className="block h-full w-full"
            viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          >
            {ticks.map((tick) => (
              <line
                key={tick}
                x1={CHART_PADDING}
                x2={width - CHART_PADDING}
                y1={yAt(tick)}
                y2={yAt(tick)}
                className="stroke-line"
              />
            ))}
            <path
              d={`${line} L${xAt(days.length - 1)},${yAt(0)} L${xAt(0)},${yAt(0)} Z`}
              className="fill-brand-50"
            />
            <path
              d={line}
              fill="none"
              className="stroke-brand-600"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={xAt(index)}
              x2={xAt(index)}
              y1={CHART_PADDING}
              y2={yAt(0)}
              className="stroke-brand-200"
              strokeDasharray="3 4"
            />
            <circle
              cx={xAt(index)}
              cy={yAt(selected.total)}
              r={5}
              className="fill-brand-600 stroke-surface"
              strokeWidth={2}
            />
          </svg>
        </div>
        <div aria-hidden="true" className="relative col-start-2 h-4 text-xs text-muted">
          {dateTicks.map((point) => {
            const parts = dayParts(days[point]!.date);
            return (
              <span
                key={point}
                className="absolute -translate-x-1/2 whitespace-nowrap"
                style={{ left: `${(xAt(point) / width) * 100}%` }}
              >
                {parts.day} {parts.month}
              </span>
            );
          })}
        </div>
      </div>
      <details className="border-t border-line">
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-brand-700">
          Ver ingresos por día
        </summary>
        <div className="@container">
          <div className="max-h-80 overflow-y-auto overscroll-contain">
            <div
              aria-hidden="true"
              className="sticky top-0 z-1 grid grid-cols-1 gap-x-8 border-b border-line bg-surface text-xs font-medium text-muted @xl:grid-cols-2"
            >
              <div className="flex justify-between gap-3 py-2">
                <span>Fecha</span>
                <span>Ingresos</span>
              </div>
              <div className="hidden justify-between gap-3 py-2 @xl:flex">
                <span>Fecha</span>
                <span>Ingresos</span>
              </div>
            </div>
            <dl
              aria-label="Ingresos diarios de facturas pagadas, en pesos colombianos"
              className="grid grid-cols-1 gap-x-8 text-sm tabular-nums @xl:grid-flow-col @xl:grid-cols-2 @xl:grid-rows-[repeat(var(--revenue-rows),auto)]"
              style={{ "--revenue-rows": Math.ceil(days.length / 2) } as CSSProperties}
            >
              {days.map((day) => (
                <div
                  key={day.date}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-baseline gap-3 border-b border-line py-2"
                >
                  <dt className="text-muted">
                    <time dateTime={day.date}>{formatDate(day.date)}</time>
                  </dt>
                  <dd className="text-right font-medium [overflow-wrap:anywhere]">
                    {formatCop(day.total)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </details>
    </div>
  );
}
