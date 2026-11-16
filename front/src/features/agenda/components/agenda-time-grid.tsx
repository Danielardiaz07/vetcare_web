"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { appointmentErrorMessage } from "@/features/appointments/errors";
import { ownerFullName } from "@/features/owners/labels";
import { APPOINTMENT_TYPE_LABELS } from "@/features/staff/labels";
import { APPOINTMENT_STATUS } from "@/lib/appointment-status";
import { clinicDateOf, formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import { registerArrival } from "@/services/appointments";
import { useAgendaClock } from "@/features/agenda/hooks/use-agenda-clock";
import {
  AGENDA_SLOT_MINUTES,
  agendaColumnPages,
  agendaTimePosition,
  minutesOf,
  snappedMarkerOffset,
  timeOfMinutes,
  type dayTimeline,
} from "@/features/agenda/timeline";
import type { Appointment } from "@/types/domain";

const MIN_COLUMN_WIDTH_REM = 13;
const WEEK_COLUMN_WIDTH_REM = 10;
const DEFAULT_FONT_SIZE = 16;
const TIME_AXIS_WIDTH_REM = 5;
const ROW_HEIGHT_REM = 6;

type AgendaTimeGridProps = {
  date: string;
  timeline: ReturnType<typeof dayTimeline>;
  weekly?: boolean;
  professionalId?: string;
  canRegisterArrival?: boolean;
  onOpen: (appointment: Appointment) => void;
  onChanged: (appointment: Appointment, message: string) => void;
};

export function AgendaTimeGrid({
  date,
  timeline,
  weekly = false,
  professionalId,
  canRegisterArrival = false,
  onOpen,
  onChanged,
}: AgendaTimeGridProps) {
  const id = useId();
  const frameRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const firstSlotRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const markerProgressRef = useRef<HTMLDivElement>(null);
  const markerLineRef = useRef<HTMLDivElement>(null);
  const markerDotRef = useRef<SVGCircleElement>(null);
  const expectedScrollTop = useRef(0);
  const [following, setFollowing] = useState(true);
  const [columnCapacity, setColumnCapacity] = useState(1);
  const [columnPage, setColumnPage] = useState<number | null>(null);
  const now = useAgendaClock();
  const pendingIds = useRef(new Set<string>());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const { slots, columns: allColumns } = timeline;
  const today = now ? clinicDateOf(now) : null;
  const pages = useMemo(
    () =>
      weekly
        ? [allColumns.map((column) => ({ ...column, laneLabel: "" }))]
        : agendaColumnPages(allColumns, columnCapacity),
    [allColumns, columnCapacity, weekly],
  );
  const page = Math.min(columnPage ?? 0, Math.max(0, pages.length - 1));
  const columns = pages[page] ?? [];
  const todayColumn = columns.findIndex((column) => column.date === today);
  const currentTime = agendaTimePosition(
    weekly && todayColumn >= 0 ? today! : date,
    slots,
    weekly && todayColumn < 0 ? null : now,
  );
  const currentSlotIndex = currentTime?.slotIndex;
  const currentFraction = currentTime?.inRange ? currentTime.fraction : undefined;
  const canReturnToNow = Boolean(currentTime && !following);

  useEffect(() => setColumnPage(null), [date, professionalId]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const header = headerRef.current;
    const firstSlot = firstSlotRef.current;
    if (!viewport || !header || !firstSlot) return;

    const align = () => {
      const rowHeight = firstSlot.getBoundingClientRect().height;
      const headerHeight = header.getBoundingClientRect().height;
      const rem =
        Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || DEFAULT_FONT_SIZE;
      const availableWidth = viewport.clientWidth - firstSlot.getBoundingClientRect().width;
      const capacity = Math.max(
        1,
        Math.floor(
          availableWidth / ((weekly ? WEEK_COLUMN_WIDTH_REM : MIN_COLUMN_WIDTH_REM) * rem),
        ),
      );
      setColumnCapacity((current) => (current === capacity ? current : capacity));
      viewport.style.setProperty("--agenda-header-height", `${headerHeight}px`);
      if (following && currentSlotIndex !== undefined) {
        viewport.scrollTo({
          top: currentSlotIndex * rowHeight,
          left: weekly ? viewport.scrollLeft : 0,
          behavior: "instant",
        });
        expectedScrollTop.current = viewport.scrollTop;
      }
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(viewport);
    observer.observe(header);
    observer.observe(firstSlot);
    return () => observer.disconnect();
  }, [currentSlotIndex, following, slots.length, professionalId, columns.length, weekly]);

  useLayoutEffect(() => {
    const marker = markerRef.current;
    const progress = markerProgressRef.current;
    const viewport = viewportRef.current;
    const frame = frameRef.current;
    const line = markerLineRef.current;
    const dot = markerDotRef.current;
    if (
      !marker ||
      !progress ||
      !viewport ||
      !frame ||
      !line ||
      !dot ||
      currentFraction === undefined
    )
      return;

    const alignMarker = () => {
      const bounds = marker.getBoundingClientRect();
      const offset = snappedMarkerOffset(
        bounds.top,
        bounds.height,
        currentFraction,
        window.devicePixelRatio,
      );
      progress.style.top = `${offset}px`;
      const frameBounds = frame.getBoundingClientRect();
      const viewportBounds = viewport.getBoundingClientRect();
      const lineBounds = line.getBoundingClientRect();
      const centerY = lineBounds.top + lineBounds.height / 2;
      dot.setAttribute(
        "cx",
        `${(weekly ? bounds.left : (viewportBounds.left + bounds.left) / 2) - frameBounds.left}`,
      );
      dot.setAttribute("cy", `${centerY - frameBounds.top}`);
      const visibleTop = headerRef.current?.getBoundingClientRect().bottom ?? viewportBounds.top;
      const visibleBottom = viewportBounds.top + viewport.clientTop + viewport.clientHeight;
      const visibleLeft = headerRef.current?.getBoundingClientRect().right ?? viewportBounds.left;
      const visibleRight = viewportBounds.left + viewport.clientLeft + viewport.clientWidth;
      dot.style.visibility =
        centerY >= visibleTop &&
        centerY <= visibleBottom &&
        (!weekly || (bounds.left >= visibleLeft && bounds.left <= visibleRight))
          ? "visible"
          : "hidden";
    };
    alignMarker();
    const observer = new ResizeObserver(alignMarker);
    observer.observe(marker);
    observer.observe(viewport);
    observer.observe(frame);
    if (headerRef.current) observer.observe(headerRef.current);
    viewport.addEventListener("scroll", alignMarker, { passive: true });
    window.addEventListener("scroll", alignMarker, { passive: true });
    window.addEventListener("resize", alignMarker);
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", alignMarker);
      window.removeEventListener("scroll", alignMarker);
      window.removeEventListener("resize", alignMarker);
    };
  }, [currentFraction, currentSlotIndex, following, columns, error, pages.length, weekly]);

  async function arrive(appointment: Appointment) {
    if (!canRegisterArrival || pendingIds.current.has(appointment.id)) return;
    pendingIds.current.add(appointment.id);
    setPending(new Set(pendingIds.current));
    setError(null);
    try {
      onChanged(
        await registerArrival(appointment.id),
        `Llegada de ${appointment.patient.name} registrada`,
      );
    } catch (failure) {
      setError(`${appointment.patient.name}: ${appointmentErrorMessage(failure)}`);
    } finally {
      pendingIds.current.delete(appointment.id);
      setPending(new Set(pendingIds.current));
    }
  }

  if (columns.length === 0)
    return <p className="text-muted">No hay profesionales ni citas para mostrar.</p>;
  if (slots.length === 0)
    return (
      <p className="text-muted">
        No hay horarios de atención ni citas para {weekly ? "esta semana" : "este día"}.
      </p>
    );

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p id={`${id}-hint`} className="text-sm text-muted">
          {canRegisterArrival && !weekly
            ? "Franjas de 30 minutos. Abre una cita para ver su detalle o pulsa “Llegó” para registrar la llegada."
            : "Franjas de 30 minutos. Abre una cita para ver su detalle y gestionar la atención."}
        </p>
        <button
          type="button"
          disabled={!canReturnToNow}
          aria-hidden={!canReturnToNow}
          tabIndex={canReturnToNow ? 0 : -1}
          onClick={() => {
            setFollowing(true);
            viewportRef.current?.focus({ preventScroll: true });
          }}
          className={cn(
            "relative shrink-0 rounded-xs text-sm leading-5 font-medium text-brand-700 underline-offset-4 after:absolute after:inset-x-0 after:-inset-y-3 after:content-[''] hover:underline",
            !canReturnToNow && "invisible",
          )}
        >
          Volver a hora actual
        </button>
      </div>
      {columns.some((column) => column.blocks === null) && (
        <p role="status" className="text-sm text-muted">
          Algunos horarios no están disponibles. Las citas se siguen mostrando.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {!weekly && pages.length > 1 && (
        <nav
          aria-label="Grupos de profesionales de la agenda"
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <p className="text-sm text-muted">
            Grupo {page + 1} de {pages.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={page === 0}
              onClick={() => setColumnPage(page - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              disabled={page === pages.length - 1}
              onClick={() => setColumnPage(page + 1)}
            >
              Siguiente
            </Button>
          </div>
        </nav>
      )}
      <div ref={frameRef} className="relative min-w-0">
        <div
          ref={viewportRef}
          role="region"
          aria-label={
            weekly
              ? `Agenda semanal desde el ${formatLongDate(date)} por día y hora`
              : `Agenda del ${formatLongDate(date)} por profesional y hora`
          }
          aria-describedby={`${id}-hint`}
          tabIndex={0}
          onScroll={(event) => {
            if (
              following &&
              Math.abs(event.currentTarget.scrollTop - expectedScrollTop.current) > 1
            )
              setFollowing(false);
          }}
          className={cn(
            "max-h-[70dvh] overflow-y-auto overscroll-contain rounded-chip border border-line bg-surface",
            weekly ? "overflow-x-auto" : "overflow-x-hidden",
          )}
        >
          <div
            className="isolate grid w-full min-w-0"
            style={{
              gridTemplateColumns: `${TIME_AXIS_WIDTH_REM}rem ${columns.map((column) => `minmax(${weekly ? `${WEEK_COLUMN_WIDTH_REM * column.lanes}rem` : "0"}, ${column.lanes}fr)`).join(" ")}`,
              gridTemplateRows: `auto repeat(${slots.length}, ${ROW_HEIGHT_REM}rem)`,
              minWidth: weekly
                ? `${TIME_AXIS_WIDTH_REM + columns.reduce((width, column) => width + WEEK_COLUMN_WIDTH_REM * column.lanes, 0)}rem`
                : undefined,
            }}
          >
            <div
              ref={headerRef}
              className="sticky top-0 left-0 z-30 flex items-center border-r border-b border-line bg-canvas px-3 text-xs font-semibold text-muted"
            >
              Hora
            </div>
            {columns.map((column, index) => (
              <div
                key={column.key}
                aria-current={weekly && column.date === today ? "date" : undefined}
                className={cn(
                  "sticky top-0 z-20 flex min-w-0 flex-col justify-center gap-1 border-r border-b border-line px-3 py-3",
                  weekly && column.date === today ? "bg-brand-50 text-brand-700" : "bg-canvas",
                )}
              >
                <h3
                  id={`${id}-professional-${index}`}
                  className="text-sm font-semibold break-words"
                >
                  {weekly ? formatLongDate(column.date) : ownerFullName(column.professional)}
                </h3>
                <p className="text-xs text-muted">
                  {!weekly && `${column.kind === "VET" ? "Veterinario" : "Estilista"} · `}
                  {column.entries.length} {column.entries.length === 1 ? "cita" : "citas"}
                </p>
                {column.laneLabel && <p className="text-xs text-muted">{column.laneLabel}</p>}
              </div>
            ))}
            {slots.map((minute, index) => (
              <div
                key={minute}
                ref={index === 0 ? firstSlotRef : undefined}
                aria-hidden="true"
                style={{ gridColumn: 1, gridRow: index + 2 }}
                className={cn(
                  "relative border-r border-b border-line bg-canvas px-3 py-2 text-xs font-medium text-muted tabular-nums",
                  weekly && "sticky left-0 z-20",
                )}
              >
                <span className="relative z-20 -mx-1 inline-block bg-canvas px-1 leading-none [text-box:trim-both_cap_alphabetic]">
                  {timeOfMinutes(minute)}
                </span>
              </div>
            ))}
            {columns.map((column, index) => (
              <section
                key={column.key}
                aria-labelledby={`${id}-professional-${index}`}
                className="grid min-w-0 border-r border-line"
                style={{
                  gridColumn: index + 2,
                  gridRow: `2 / span ${slots.length}`,
                  gridTemplateRows: `repeat(${slots.length}, minmax(0, 1fr))`,
                  gridTemplateColumns: `repeat(${column.lanes}, minmax(0, 1fr))`,
                }}
              >
                {slots.map((minute, row) => {
                  const working = column.blocks?.some(
                    (block) =>
                      minutesOf(block.startTime) <= minute &&
                      minute + AGENDA_SLOT_MINUTES <= minutesOf(block.endTime),
                  );
                  return (
                    <div
                      key={minute}
                      aria-hidden="true"
                      style={{ gridRow: row + 1, gridColumn: "1 / -1" }}
                      className={cn("border-b border-line", working === false && "bg-canvas")}
                    />
                  );
                })}
                {column.entries.map(({ appointment, row, span, lane }) => (
                  <div
                    key={appointment.id}
                    style={{ gridRow: `${row} / span ${span}`, gridColumn: lane + 1 }}
                    className="z-1 min-h-0 min-w-0 p-1"
                  >
                    <AppointmentTile
                      appointment={appointment}
                      busy={pending.has(appointment.id)}
                      onOpen={onOpen}
                      onArrive={
                        canRegisterArrival && !weekly ? () => void arrive(appointment) : undefined
                      }
                    />
                  </div>
                ))}
              </section>
            ))}
            {currentTime?.inRange && (
              <div
                ref={markerRef}
                className="pointer-events-none relative z-10 min-w-0"
                style={{
                  gridColumn: weekly ? todayColumn + 2 : "1 / -1",
                  gridRow: currentTime.slotIndex + 2,
                }}
              >
                <div
                  ref={markerProgressRef}
                  className="absolute inset-x-0"
                  style={{ top: `${currentTime.fraction * 100}%` }}
                >
                  <div
                    ref={markerLineRef}
                    aria-hidden="true"
                    className="absolute inset-x-0 h-px bg-brand-600"
                  />
                  <time dateTime={now?.toISOString()} className="sr-only">
                    Hora actual: {currentTime.label}
                  </time>
                </div>
              </div>
            )}
          </div>
        </div>
        {currentTime?.inRange && (
          <svg
            aria-hidden="true"
            focusable="false"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
          >
            <circle
              ref={markerDotRef}
              cx={0}
              cy={0}
              r={2}
              className="fill-brand-600"
              style={{ visibility: "hidden" }}
            />
          </svg>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-xs border border-line bg-surface" />
          Horario de atención
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-3 rounded-xs border border-line bg-canvas" />
          Fuera de horario
        </span>
        <span>Los espacios sin cita no garantizan disponibilidad.</span>
      </div>
    </div>
  );
}

function AppointmentTile({
  appointment,
  busy,
  onOpen,
  onArrive,
}: {
  appointment: Appointment;
  busy: boolean;
  onOpen: AgendaTimeGridProps["onOpen"];
  onArrive?: () => void;
}) {
  const status = APPOINTMENT_STATUS[appointment.status];
  const time = formatClinicTime(appointment.startsAt);
  const type = APPOINTMENT_TYPE_LABELS[appointment.type];
  return (
    <div
      className={cn(
        "flex h-full min-w-0 rounded-control border bg-surface",
        appointment.status === "CONFIRMED" ? "border-success-border" : "border-line",
        (appointment.status === "CANCELLED" || appointment.status === "NO_SHOW") && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(appointment)}
        aria-label={`${time}, ${appointment.patient.name}, ${type}, ${status.label}. Ver detalle`}
        className="flex min-h-11 min-w-0 flex-1 flex-col justify-start gap-1 rounded-control p-2 text-left hover:bg-brand-50"
      >
        <span className="sticky top-[calc(var(--agenda-header-height,0px)+0.5rem)] flex w-full min-w-0 flex-col items-start gap-1">
          <span className="w-full truncate text-xs text-muted">
            {time} · {type}
          </span>
          <span className="w-full truncate text-sm font-semibold">{appointment.patient.name}</span>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </span>
      </button>
      {onArrive && appointment.status === "SCHEDULED" && (
        <button
          type="button"
          disabled={busy}
          aria-busy={busy || undefined}
          aria-label={`Registrar llegada de ${appointment.patient.name}, ${time}`}
          onClick={onArrive}
          className="sticky top-[calc(var(--agenda-header-height,0px)+0.5rem)] m-1 flex min-h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-1 self-start rounded-control px-1 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? (
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
            />
          ) : (
            <Icon name="check" className="size-4" />
          )}
          <span>{busy ? "Guardando" : "Llegó"}</span>
        </button>
      )}
    </div>
  );
}
