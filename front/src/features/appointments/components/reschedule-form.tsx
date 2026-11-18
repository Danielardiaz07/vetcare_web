"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ChoiceButton } from "@/features/appointments/components/choice-button";
import {
  appointmentErrorMessage,
  isSlotTaken,
  SLOT_TAKEN_MESSAGE,
} from "@/features/appointments/errors";
import {
  bookableDates,
  clinicDateOf,
  dayParts,
  formatClinicTime,
  formatLongDate,
} from "@/lib/clinic-time";
import { getAvailability, rescheduleAppointment } from "@/services/appointments";
import type { Appointment, Availability } from "@/types/domain";

type AvailabilityState =
  { status: "loading" } | { status: "error" } | { status: "ready"; data: Availability };

type RescheduleFormProps = {
  appointment: Appointment;
  onCancel: () => void;
  onRescheduled: (appointment: Appointment) => void;
  loadAvailability?: typeof getAvailability;
  onSave?: (startsAt: string) => Promise<Appointment>;
};

export function RescheduleForm({
  appointment,
  onCancel,
  onRescheduled,
  loadAvailability = getAvailability,
  onSave,
}: RescheduleFormProps) {
  const dates = useMemo(() => bookableDates(), []);
  const currentDate = clinicDateOf(new Date(appointment.startsAt));
  const [date, setDate] = useState(dates.includes(currentDate) ? currentDate : (dates[0] ?? ""));
  const [startsAt, setStartsAt] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    let active = true;
    setAvailability({ status: "loading" });
    loadAvailability({ type: appointment.type, date, professionalId: appointment.professional.id })
      .then((data) => {
        if (active) setAvailability({ status: "ready", data });
      })
      .catch(() => {
        if (active) setAvailability({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [appointment, date, reloadKey, loadAvailability]);

  function pickDate(next: string) {
    setDate(next);
    setStartsAt(null);
    setError(null);
  }

  async function handleConfirm() {
    if (submittingRef.current) return;
    if (!startsAt) {
      setError("Elige una hora para continuar.");
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      onRescheduled(
        await (onSave ? onSave(startsAt) : rescheduleAppointment(appointment.id, { startsAt })),
      );
    } catch (failure) {
      if (isSlotTaken(failure)) {
        setStartsAt(null);
        setReloadKey((key) => key + 1);
        setError(SLOT_TAKEN_MESSAGE);
      } else {
        setError(appointmentErrorMessage(failure));
      }
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-divider pt-4">
      <h4 className="font-semibold text-ink">Elige un nuevo horario</h4>
      <div
        role="group"
        aria-label="Día"
        className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2"
      >
        {dates.map((item) => {
          const parts = dayParts(item);
          return (
            <ChoiceButton
              key={item}
              selected={item === date}
              disabled={saving}
              onSelect={() => pickDate(item)}
              ariaLabel={formatLongDate(item)}
              className="items-center text-center"
              label={parts.day}
              detail={`${parts.weekday} · ${parts.month}`}
            />
          );
        })}
      </div>

      {availability.status === "loading" && <LoadingState rows={1} />}
      {availability.status === "error" && (
        <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />
      )}
      {availability.status === "ready" && availability.data.slots.length > 0 && (
        <div
          role="group"
          aria-label={`Horas libres el ${formatLongDate(date)}`}
          className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2"
        >
          {availability.data.slots.map((slot) => (
            <ChoiceButton
              key={slot.startsAt}
              selected={slot.startsAt === startsAt}
              disabled={saving}
              onSelect={() => {
                setStartsAt(slot.startsAt);
                setError(null);
              }}
              className="items-center"
              label={formatClinicTime(slot.startsAt)}
            />
          ))}
        </div>
      )}
      {availability.status === "ready" && availability.data.slots.length === 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-ink">No quedan horas libres ese día.</p>
          {availability.data.suggestedDates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {availability.data.suggestedDates.map((item) => (
                <ChoiceButton
                  key={item}
                  selected={false}
                  disabled={saving}
                  onSelect={() => pickDate(item)}
                  label={formatLongDate(item)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={saving} onClick={onCancel}>
          Volver
        </Button>
        <Button loading={saving} onClick={() => void handleConfirm()}>
          Confirmar cambio
        </Button>
      </div>
    </div>
  );
}
