"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { DatePicker } from "@/components/ui/date-picker";
import { LoadingState } from "@/components/ui/loading-state";
import { isProcedureAppointment } from "@/lib/appointment-procedures";
import { formatClinicTime, formatFullClinicDate, formatLongDate } from "@/lib/clinic-time";
import { MIN_APPOINTMENT_LEAD_HOURS } from "@/lib/constants";
import { getAvailability } from "@/services/appointments";
import type { AppointmentType, Availability, AvailableSlot } from "@/types/domain";

const HOUR_MS = 60 * 60 * 1000;
type LoadState =
  | { status: "loading" }
  | { status: "error"; key: string }
  | { status: "ready"; key: string; data: Availability };
type DateTimeAvailabilityProps = {
  type: AppointmentType | null;
  professionalId?: string;
  durationMinutes?: number;
  dates: string[];
  date: string | null;
  slot: Pick<AvailableSlot, "startsAt"> | null;
  refreshKey: number;
  loadAvailability?: typeof getAvailability;
  disabled?: boolean;
  showSuggestedDates?: boolean;
  maxSlotColumns?: 2 | 4;
  onChange: (date: string, slot: AvailableSlot | null) => void;
};

export function DateTimeAvailability({
  type,
  professionalId,
  durationMinutes,
  dates,
  date,
  slot,
  refreshKey,
  loadAvailability = getAvailability,
  disabled = false,
  showSuggestedDates = false,
  maxSlotColumns = 4,
  onChange,
}: DateTimeAvailabilityProps) {
  const first = dates[0] ?? "";
  const last = dates.at(-1) ?? first;
  const day = date && date >= first && date <= last ? date : first;
  const needsDuration =
    type !== null && isProcedureAppointment(type) && durationMinutes === undefined;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const request = useRef<{
    key: string;
    load: typeof getAvailability;
    promise: Promise<Availability>;
  } | null>(null);
  const key = `${type}:${professionalId ?? "any"}:${durationMinutes ?? "default"}:${day}:${refreshKey}:${retryKey}`;

  useEffect(() => {
    if (!type || needsDuration) return;
    let active = true;
    setState({ status: "loading" });
    // Evita consultas duplicadas al repetir el efecto en Strict Mode.
    if (request.current?.key !== key || request.current.load !== loadAvailability) {
      request.current = {
        key,
        load: loadAvailability,
        promise: loadAvailability({ type, date: day, professionalId, durationMinutes }),
      };
    }
    request.current.promise
      .then((data) => {
        if (active) setState({ status: "ready", key, data });
      })
      .catch(() => {
        if (active) setState({ status: "error", key });
      });
    return () => {
      active = false;
    };
  }, [type, professionalId, durationMinutes, day, key, loadAvailability, needsDuration]);

  const ready = state.status === "ready" && state.key === key;
  const slots = ready
    ? state.data.slots.filter(
        (available) =>
          new Date(available.startsAt).getTime() >=
          Date.now() + MIN_APPOINTMENT_LEAD_HOURS * HOUR_MS,
      )
    : [];
  const suggestedDates =
    ready && showSuggestedDates
      ? state.data.suggestedDates.filter((suggestion) => suggestion >= first && suggestion <= last)
      : [];

  return (
    <fieldset
      disabled={disabled}
      className="grid w-full min-w-0 items-start gap-8 @min-[30rem]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] @min-[34rem]:grid-cols-[18rem_minmax(0,1fr)] @min-[48rem]:gap-x-6"
    >
      <div className="w-full max-w-72">
        <DatePicker
          value={day}
          min={first}
          max={last}
          variant="inline"
          label="Fecha"
          onChange={(next) => onChange(next, null)}
        />
      </div>
      <section
        aria-label="Horarios disponibles"
        className="@container/slots flex min-w-0 flex-col gap-3"
      >
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-ink">Horarios disponibles</h3>
          <p
            aria-live="polite"
            className="text-sm leading-snug font-semibold text-brand-700 first-letter:uppercase"
          >
            <time dateTime={day}>{formatFullClinicDate(day)}</time>
          </p>
        </div>
        {!type ? (
          <p className="text-sm text-muted">
            Elige el tipo de cita y el profesional para consultar las horas disponibles.
          </p>
        ) : needsDuration ? (
          <p className="text-sm text-muted">Escribe una duración válida para ver los horarios.</p>
        ) : state.status === "error" && state.key === key ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-danger">No pudimos cargar los horarios.</p>
            <Button
              variant="secondary"
              className="self-start"
              onClick={() => setRetryKey((value) => value + 1)}
            >
              Reintentar
            </Button>
          </div>
        ) : !ready ? (
          <LoadingState rows={2} />
        ) : slots.length ? (
          <div
            className={cn(
              "grid grid-cols-2 gap-2",
              maxSlotColumns === 4 &&
                "@min-[20rem]/slots:grid-cols-3 @min-[29.5rem]/slots:grid-cols-4",
            )}
          >
            {slots.map((available) => (
              <button
                key={available.startsAt}
                type="button"
                aria-pressed={slot?.startsAt === available.startsAt}
                aria-label={`${formatLongDate(day)}, ${formatClinicTime(available.startsAt)}`}
                onClick={() => onChange(day, available)}
                className={cn(
                  "min-h-11 rounded-control border px-3 text-sm font-medium transition-colors duration-150 ease-out",
                  slot?.startsAt === available.startsAt
                    ? "border-brand-600 bg-brand-600 text-white"
                    : "border-field-border bg-surface text-ink hover:bg-brand-50",
                )}
              >
                {formatClinicTime(available.startsAt)}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted">Sin horarios disponibles.</p>
            {suggestedDates.length > 0 && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Fechas sugeridas">
                {suggestedDates.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="secondary"
                    className="text-sm first-letter:uppercase"
                    onClick={() => onChange(suggestion, null)}
                  >
                    {formatLongDate(suggestion)}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </fieldset>
  );
}
