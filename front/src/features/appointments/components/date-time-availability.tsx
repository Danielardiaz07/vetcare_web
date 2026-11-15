"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { DatePicker } from "@/components/ui/date-picker";
import { LoadingState } from "@/components/ui/loading-state";
import { formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import { MIN_APPOINTMENT_LEAD_HOURS } from "@/lib/constants";
import { getAvailability } from "@/services/appointments";
import type { AppointmentType, Availability, AvailableSlot } from "@/types/domain";

const HOUR_MS = 60 * 60 * 1000;
type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; key: string; data: Availability };
type DateTimeAvailabilityProps = {
  type: AppointmentType;
  professionalId?: string;
  dates: string[];
  date: string | null;
  slot: AvailableSlot | null;
  refreshKey: number;
  onChange: (date: string, slot: AvailableSlot | null) => void;
};

export function DateTimeAvailability({
  type,
  professionalId,
  dates,
  date,
  slot,
  refreshKey,
  onChange,
}: DateTimeAvailabilityProps) {
  const first = dates[0] ?? "";
  const last = dates.at(-1) ?? first;
  const day = date && date >= first && date <= last ? date : first;
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [retryKey, setRetryKey] = useState(0);
  const request = useRef<{ key: string; promise: Promise<Availability> } | null>(null);
  const key = `${type}:${professionalId ?? "any"}:${day}:${refreshKey}:${retryKey}`;

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    // Evita consultas duplicadas al repetir el efecto en Strict Mode.
    if (request.current?.key !== key) {
      request.current = {
        key,
        promise: getAvailability({ type, date: day, ...(professionalId && { professionalId }) }),
      };
    }
    request.current.promise
      .then((data) => {
        if (active) setState({ status: "ready", key, data });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [type, professionalId, day, key]);

  const ready = state.status === "ready" && state.key === key;
  const slots = ready
    ? state.data.slots.filter(
        (available) =>
          new Date(available.startsAt).getTime() >=
          Date.now() + MIN_APPOINTMENT_LEAD_HOURS * HOUR_MS,
      )
    : [];

  return (
    <div className="grid min-w-0 items-start gap-8 @min-[30rem]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <DatePicker
        value={day}
        min={first}
        max={last}
        variant="inline"
        label="Fecha"
        onChange={(next) => onChange(next, null)}
      />
      <section aria-label="Horarios disponibles" className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-ink">Horarios disponibles</h3>
          <p className="text-sm text-muted first-letter:uppercase">{formatLongDate(day)}</p>
        </div>
        {state.status === "error" ? (
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
          <div className="grid grid-cols-2 gap-2">
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
          <p className="text-sm text-muted">Sin horarios disponibles.</p>
        )}
      </section>
    </div>
  );
}
