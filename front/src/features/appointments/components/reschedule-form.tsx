"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DateTimeAvailability } from "@/features/appointments/components/date-time-availability";
import {
  appointmentErrorMessage,
  isSlotTaken,
  SLOT_TAKEN_MESSAGE,
} from "@/features/appointments/errors";
import { ProcedureDurationField } from "@/features/appointments/components/procedure-duration-field";
import {
  formatProcedureDuration,
  isProcedureAppointment,
  parseProcedureDuration,
} from "@/lib/appointment-procedures";
import { bookableDates, clinicDateOf } from "@/lib/clinic-time";
import { getAvailability, rescheduleAppointment } from "@/services/appointments";
import type { Appointment, AvailableSlot } from "@/types/domain";

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
  const isProcedure = isProcedureAppointment(appointment.type);
  const [date, setDate] = useState(dates.includes(currentDate) ? currentDate : (dates[0] ?? ""));
  const [durationText, setDurationText] = useState(() =>
    isProcedure ? formatProcedureDuration(appointment.durationMinutes) : "",
  );
  const [validateDuration, setValidateDuration] = useState(false);
  const [slot, setSlot] = useState<AvailableSlot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);
  const duration = isProcedure ? parseProcedureDuration(durationText) : undefined;

  async function handleConfirm() {
    if (submittingRef.current) return;
    if (isProcedure && duration === undefined) {
      setValidateDuration(true);
      return;
    }
    if (!slot) {
      setError("Elige una hora para continuar.");
      return;
    }
    const { startsAt } = slot;
    submittingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      onRescheduled(
        await (onSave
          ? onSave(startsAt)
          : rescheduleAppointment(appointment.id, { startsAt, durationMinutes: duration })),
      );
    } catch (failure) {
      if (isSlotTaken(failure)) {
        setSlot(null);
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
    <div className="@container flex min-w-0 flex-col gap-4 border-t border-divider pt-4">
      <h3 className="font-semibold text-ink">Elige un nuevo horario</h3>
      {isProcedure && (
        <div className="max-w-xs">
          <ProcedureDurationField
            value={durationText}
            disabled={saving}
            showError={validateDuration}
            onChange={(value) => {
              setDurationText(value);
              if (parseProcedureDuration(value) !== duration) setSlot(null);
              setError(null);
            }}
          />
        </div>
      )}
      <DateTimeAvailability
        type={appointment.type}
        professionalId={appointment.professional.id}
        durationMinutes={duration}
        dates={dates}
        date={date}
        slot={slot}
        refreshKey={reloadKey}
        loadAvailability={loadAvailability}
        disabled={saving}
        showSuggestedDates
        onChange={(nextDate, nextSlot) => {
          if (nextDate === date && !nextSlot) return;
          setDate(nextDate);
          setSlot(nextSlot);
          setError(null);
        }}
      />

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
