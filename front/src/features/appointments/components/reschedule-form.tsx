"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChoiceButton } from "@/features/appointments/components/choice-button";
import { DateTimeAvailability } from "@/features/appointments/components/date-time-availability";
import {
  appointmentErrorMessage,
  isSlotTaken,
  SLOT_TAKEN_MESSAGE,
} from "@/features/appointments/errors";
import { ProcedureDurationField } from "@/features/appointments/components/procedure-duration-field";
import { ownerFullName } from "@/features/owners/labels";
import {
  formatProcedureDuration,
  isProcedureAppointment,
  parseProcedureDuration,
} from "@/lib/appointment-procedures";
import { bookableDates, clinicDateOf } from "@/lib/clinic-time";
import { getAvailability, listProfessionals, rescheduleAppointment } from "@/services/appointments";
import type { Appointment, AvailableSlot, Professional } from "@/types/domain";

const ANY_PROFESSIONAL = "any";

type ProfessionalsState =
  { status: "loading" } | { status: "error" } | { status: "ready"; data: Professional[] };

type RescheduleFormProps = {
  appointment: Appointment;
  onCancel: () => void;
  onRescheduled: (appointment: Appointment) => void;
  loadAvailability?: typeof getAvailability;
  onSave?: (startsAt: string, professionalId: string) => Promise<Appointment>;
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
  const [professionalId, setProfessionalId] = useState(appointment.professional.id);
  const [professionals, setProfessionals] = useState<ProfessionalsState>({ status: "loading" });
  const [professionalsKey, setProfessionalsKey] = useState(0);
  const [slot, setSlot] = useState<AvailableSlot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submittingRef = useRef(false);
  const duration = isProcedure ? parseProcedureDuration(durationText) : undefined;
  const slotProfessional = slot?.professionals[0];
  const listedProfessionals = professionals.status === "ready" ? professionals.data : [];
  const currentProfessional =
    listedProfessionals.find((professional) => professional.id === appointment.professional.id) ??
    appointment.professional;
  const options = [
    currentProfessional,
    ...listedProfessionals.filter((professional) => professional.id !== currentProfessional.id),
  ];

  useEffect(() => {
    let active = true;
    setProfessionals({ status: "loading" });
    listProfessionals(appointment.type, true)
      .then((data) => {
        if (active) setProfessionals({ status: "ready", data });
      })
      .catch(() => {
        if (active) setProfessionals({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [appointment.type, professionalsKey]);

  function selectProfessional(next: string) {
    setProfessionalId(next);
    setSlot(null);
    setError(null);
  }

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
    const selectedProfessionalId =
      professionalId === ANY_PROFESSIONAL ? slotProfessional?.id : professionalId;
    if (!selectedProfessionalId) {
      setSlot(null);
      setReloadKey((key) => key + 1);
      setError(SLOT_TAKEN_MESSAGE);
      return;
    }
    const { startsAt } = slot;
    submittingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      onRescheduled(
        await (onSave
          ? onSave(startsAt, selectedProfessionalId)
          : rescheduleAppointment(appointment.id, {
              startsAt,
              professionalId: selectedProfessionalId,
              durationMinutes: duration,
            })),
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
      <h3 className="font-semibold text-ink">
        Cambio de horario y/o {appointment.type === "GROOMING" ? "estilista" : "veterinario"}
      </h3>
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
      <div className="grid min-w-0 items-start gap-6 @min-[46rem]:grid-cols-[13rem_minmax(0,1fr)]">
        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-2">
          <legend className="mb-3 font-semibold text-ink">
            {appointment.type === "GROOMING" ? "Estilista" : "Veterinario"}
          </legend>
          {options.map((professional) => (
            <ChoiceButton
              key={professional.id}
              selected={professionalId === professional.id}
              onSelect={() => selectProfessional(professional.id)}
              label={ownerFullName(professional)}
              detail={
                professional.id === appointment.professional.id ? (
                  <>
                    <span className="font-medium text-ink underline underline-offset-2">
                      Actual
                    </span>
                    {professional.specialty && ` · ${professional.specialty}`}
                  </>
                ) : (
                  professional.specialty
                )
              }
              className="w-full [overflow-wrap:anywhere]"
            />
          ))}
          {!isProcedure && (
            <ChoiceButton
              selected={professionalId === ANY_PROFESSIONAL}
              onSelect={() => selectProfessional(ANY_PROFESSIONAL)}
              label="Cualquiera disponible"
              detail="Ver horarios de todos"
              className="w-full [overflow-wrap:anywhere]"
            />
          )}
          {professionals.status === "loading" && (
            <p role="status" className="text-sm text-muted">
              Cargando profesionales…
            </p>
          )}
          {professionals.status === "error" && (
            <div className="flex flex-col items-start gap-2">
              <p role="alert" className="text-sm text-danger">
                No pudimos cargar los profesionales.
              </p>
              <Button variant="secondary" onClick={() => setProfessionalsKey((key) => key + 1)}>
                Reintentar
              </Button>
            </div>
          )}
        </fieldset>
        <div className="@container flex min-w-0 flex-col gap-3">
          <DateTimeAvailability
            type={appointment.type}
            professionalId={professionalId === ANY_PROFESSIONAL ? undefined : professionalId}
            durationMinutes={duration}
            dates={dates}
            date={date}
            slot={slot}
            refreshKey={reloadKey}
            loadAvailability={loadAvailability}
            disabled={saving}
            showSuggestedDates
            maxSlotColumns={2}
            onChange={(nextDate, nextSlot) => {
              if (nextDate === date && !nextSlot) return;
              setDate(nextDate);
              setSlot(nextSlot);
              setError(null);
            }}
          />
          {professionalId === ANY_PROFESSIONAL && slotProfessional && (
            <p className="text-sm text-muted">
              Esta hora está disponible con{" "}
              <span className="font-medium text-ink">{ownerFullName(slotProfessional)}</span>.
            </p>
          )}
        </div>
      </div>

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
