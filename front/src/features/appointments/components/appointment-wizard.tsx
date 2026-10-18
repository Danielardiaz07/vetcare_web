"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { BookingReceipt } from "@/features/appointments/components/booking-receipt";
import { BookingSummary } from "@/features/appointments/components/booking-summary";
import { ChoiceButton } from "@/features/appointments/components/choice-button";
import { ReviewStep } from "@/features/appointments/components/review-step";
import {
  appointmentErrorMessage,
  isActiveLimit,
  isSlotTaken,
  SLOT_TAKEN_MESSAGE,
} from "@/features/appointments/errors";
import { ownerFullName } from "@/features/owners/labels";
import { SPECIES_LABELS } from "@/features/patients/labels";
import { APPOINTMENT_TYPE_LABELS, durationLabel } from "@/features/staff/labels";
import { bookableDates, dayParts, formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import { MAX_ACTIVE_APPOINTMENTS_PER_PATIENT, ROUTES } from "@/lib/constants";
import { calculateAge } from "@/lib/format";
import { createAppointment, getAvailability, listProfessionals } from "@/services/appointments";
import { getMyPatients } from "@/services/patients";
import { listAppointmentTypes } from "@/services/staff";
import type {
  Appointment,
  AppointmentType,
  AppointmentTypeSetting,
  Availability,
  AvailableSlot,
  Patient,
  Professional,
} from "@/types/domain";

// D-26: "Cualquiera disponible" no manda profesional y la API asigna el primero libre.
const ANY_PROFESSIONAL = "any";
const LAST_STEP = 5;
const REVIEW = "review";

type Step = 1 | 2 | 3 | 4 | 5;
type View = Step | typeof REVIEW;

type Selection = {
  petId: string | null;
  type: AppointmentType | null;
  professionalId: string | null;
  date: string | null;
  slot: AvailableSlot | null;
};

const EMPTY_SELECTION: Selection = {
  petId: null,
  type: null,
  professionalId: null,
  date: null,
  slot: null,
};

type BaseData = { pets: Patient[]; types: AppointmentTypeSetting[] };

type Loadable<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

const professionalTitle = (type: AppointmentType | null) =>
  type === "GROOMING" ? "Estilista" : type ? "Veterinario" : "Profesional";

const STEP_MISSING: Record<Step, string> = {
  1: "una mascota",
  2: "el tipo de cita",
  3: "un profesional o “Cualquiera disponible”",
  4: "un día",
  5: "una hora",
};

function isChosen(step: Step, selection: Selection): boolean {
  const values: Record<Step, unknown> = {
    1: selection.petId,
    2: selection.type,
    3: selection.professionalId,
    4: selection.date,
    5: selection.slot,
  };
  return values[step] !== null;
}

function firstMissingStep(selection: Selection): Step {
  const steps: Step[] = [1, 2, 3, 4, 5];
  return steps.find((step) => !isChosen(step, selection)) ?? LAST_STEP;
}

type AppointmentWizardProps = {
  initialPetId?: string;
  initialType?: string;
};

export function AppointmentWizard({ initialPetId, initialType }: AppointmentWizardProps) {
  const [base, setBase] = useState<Loadable<BaseData>>({ status: "loading" });
  const [baseKey, setBaseKey] = useState(0);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [step, setStep] = useState<View>(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [bookingError, setBookingError] = useState<ReactNode>(null);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const [professionals, setProfessionals] = useState<Loadable<Professional[]>>({
    status: "loading",
  });
  const [professionalsKey, setProfessionalsKey] = useState(0);
  const [availability, setAvailability] = useState<Loadable<Availability>>({ status: "loading" });
  const [availabilityKey, setAvailabilityKey] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const movedByUser = useRef(false);
  const dates = useMemo(() => bookableDates(), []);

  useEffect(() => {
    let active = true;
    setBase({ status: "loading" });
    Promise.all([getMyPatients(), listAppointmentTypes()])
      .then(([pets, types]) => {
        if (!active) return;
        setBase({ status: "ready", data: { pets, types } });
        // ?petId= y ?type= dejan esos pasos ya elegidos si existen.
        const petId = pets.some((pet) => pet.id === initialPetId) ? (initialPetId ?? null) : null;
        const type = types.find((item) => item.type === initialType)?.type ?? null;
        const preset: Selection = { ...EMPTY_SELECTION, petId, type };
        setSelection(preset);
        setStep(firstMissingStep(preset));
      })
      .catch(() => {
        if (active) setBase({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [baseKey, initialPetId, initialType]);

  const { type, professionalId, date } = selection;

  useEffect(() => {
    if (!type) return;
    let active = true;
    setProfessionals({ status: "loading" });
    listProfessionals(type)
      .then((data) => {
        if (active) setProfessionals({ status: "ready", data });
      })
      .catch(() => {
        if (active) setProfessionals({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [type, professionalsKey]);

  useEffect(() => {
    if (!type || !professionalId || !date) return;
    let active = true;
    setAvailability({ status: "loading" });
    getAvailability({
      type,
      date,
      ...(professionalId !== ANY_PROFESSIONAL && { professionalId }),
    })
      .then((data) => {
        if (active) setAvailability({ status: "ready", data });
      })
      .catch(() => {
        if (active) setAvailability({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [type, professionalId, date, availabilityKey]);

  // Al cambiar de paso, el lector de pantalla anuncia el título nuevo.
  useEffect(() => {
    if (movedByUser.current) headingRef.current?.focus();
  }, [step]);

  // "Agendar otra cita" vuelve al paso 1 sin nada elegido.
  const restart = useCallback(() => {
    movedByUser.current = true;
    setConfirmed(null);
    setSelection(EMPTY_SELECTION);
    setReason("");
    setBookingError(null);
    setStepError(null);
    setStep(1);
  }, []);

  const choose = useCallback((changes: Partial<Selection>) => {
    setStepError(null);
    setSelection((current) => ({ ...current, ...changes }));
  }, []);

  if (base.status === "loading") return <LoadingState />;
  if (base.status === "error") return <ErrorState onRetry={() => setBaseKey((key) => key + 1)} />;

  if (confirmed) return <BookingReceipt appointment={confirmed} onBookAnother={restart} />;

  const { pets, types } = base.data;
  if (pets.length === 0) {
    return (
      <EmptyState
        title="Primero agrega a tu mascota"
        description="Para agendar necesitamos saber para quién es la cita. Pídele a recepción que la registre en tu próxima visita."
      />
    );
  }

  const pet = pets.find((item) => item.id === selection.petId);
  const setting = types.find((item) => item.type === type);
  const professional =
    professionals.status === "ready"
      ? professionals.data.find((item) => item.id === professionalId)
      : undefined;
  const proTitle = professionalTitle(type);

  const stepTitles: Record<Step, string> = {
    1: "Mascota",
    2: "Tipo de cita",
    3: proTitle,
    4: "Día",
    5: "Hora",
  };

  function goTo(next: View) {
    movedByUser.current = true;
    setStepError(null);
    setBookingError(null);
    setStep(next);
  }

  function handleNext() {
    if (step === REVIEW) return;
    if (!isChosen(step, selection)) {
      setStepError(`Elige ${STEP_MISSING[step]} para continuar.`);
      return;
    }
    goTo(step < LAST_STEP ? ((step + 1) as Step) : REVIEW);
  }

  async function handleConfirm(text: string) {
    const { petId, slot } = selection;
    if (!petId || !type || !professionalId || !slot) return;
    setReason(text);
    setBookingError(null);
    try {
      const appointment = await createAppointment({
        patientId: petId,
        type,
        startsAt: slot.startsAt,
        ...(professionalId !== ANY_PROFESSIONAL && { professionalId }),
        ...(text && { reason: text }),
      });
      setConfirmed(appointment);
    } catch (error) {
      if (isSlotTaken(error)) {
        goTo(LAST_STEP);
        choose({ slot: null });
        setStepError(SLOT_TAKEN_MESSAGE);
        setAvailabilityKey((key) => key + 1);
      } else if (isActiveLimit(error)) {
        setBookingError(
          <>
            Esta mascota ya tiene {MAX_ACTIVE_APPOINTMENTS_PER_PATIENT} citas activas. Cancela o
            espera una de ellas para agendar otra.{" "}
            <Link href={ROUTES.portalAppointments} className="font-semibold underline">
              Ir a Mis citas
            </Link>
          </>,
        );
      } else {
        setBookingError(appointmentErrorMessage(error));
      }
    }
  }

  const summaryRows = [
    { label: "Mascota", value: pet?.name ?? null },
    {
      label: "Tipo de cita",
      value: setting
        ? `${APPOINTMENT_TYPE_LABELS[setting.type]} · ${durationLabel(setting.durationMinutes)}`
        : null,
    },
    {
      label: proTitle,
      value:
        professionalId === ANY_PROFESSIONAL
          ? "Cualquiera disponible"
          : professional
            ? ownerFullName(professional)
            : null,
    },
    { label: "Día", value: date ? formatLongDate(date) : null },
    { label: "Hora", value: selection.slot ? formatClinicTime(selection.slot.startsAt) : null },
  ];

  const reviewRows =
    setting && selection.slot
      ? [
          { label: "Mascota", value: pet?.name ?? "" },
          { label: "Tipo de cita", value: APPOINTMENT_TYPE_LABELS[setting.type] },
          {
            label: proTitle,
            value:
              professionalId === ANY_PROFESSIONAL
                ? "Cualquiera disponible"
                : professional
                  ? ownerFullName(professional)
                  : "",
          },
          { label: "Fecha", value: date ? formatLongDate(date) : "" },
          { label: "Hora", value: formatClinicTime(selection.slot.startsAt) },
          { label: "Duración", value: durationLabel(setting.durationMinutes) },
        ]
      : [];
  const reviewing = step === REVIEW;

  return (
    <div className={cn("grid gap-6", !reviewing && "lg:grid-cols-[minmax(0,1fr)_18rem]")}>
      <div className="flex flex-col gap-5">
        <ol className="flex flex-wrap gap-2 text-sm" aria-label="Pasos para agendar">
          {([1, 2, 3, 4, 5] as Step[]).map((item) => (
            <li
              key={item}
              aria-current={item === step ? "step" : undefined}
              className={cn(
                "rounded-chip border px-3 py-1",
                item === step
                  ? "border-brand-600 bg-brand-50 font-semibold text-brand-700"
                  : isChosen(item, selection)
                    ? "border-line bg-surface text-ink"
                    : "border-line bg-canvas text-muted",
              )}
            >
              {item}. {stepTitles[item]}
            </li>
          ))}
        </ol>

        <section
          aria-labelledby="wizard-step-title"
          className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
        >
          <h2
            id="wizard-step-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold text-ink outline-none"
          >
            {reviewing
              ? "Revisa y confirma tu cita"
              : `Paso ${step} de ${LAST_STEP} · ${stepTitles[step]}`}
          </h2>

          {reviewing && (
            <ReviewStep
              rows={reviewRows}
              defaultReason={reason}
              error={bookingError}
              onBack={(text) => {
                setReason(text);
                goTo(LAST_STEP);
              }}
              onConfirm={handleConfirm}
            />
          )}

          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {pets.map((item) => (
                <ChoiceButton
                  key={item.id}
                  selected={item.id === selection.petId}
                  onSelect={() => choose({ petId: item.id })}
                  label={item.name}
                  detail={`${SPECIES_LABELS[item.species]} · ${calculateAge(item.birthDate)}`}
                />
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {types.map((item) => (
                <ChoiceButton
                  key={item.type}
                  selected={item.type === type}
                  onSelect={() => {
                    if (item.type !== type) {
                      choose({ type: item.type, professionalId: null, slot: null });
                    }
                  }}
                  label={APPOINTMENT_TYPE_LABELS[item.type]}
                  detail={durationLabel(item.durationMinutes)}
                />
              ))}
            </div>
          )}

          {step === 3 && professionals.status === "loading" && <LoadingState rows={2} />}
          {step === 3 && professionals.status === "error" && (
            <ErrorState onRetry={() => setProfessionalsKey((key) => key + 1)} />
          )}
          {step === 3 && professionals.status === "ready" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <ChoiceButton
                selected={professionalId === ANY_PROFESSIONAL}
                onSelect={() => choose({ professionalId: ANY_PROFESSIONAL, slot: null })}
                label="Cualquiera disponible"
                detail="Te asignamos el primero libre"
              />
              {professionals.data.map((item) => (
                <ChoiceButton
                  key={item.id}
                  selected={item.id === professionalId}
                  onSelect={() => choose({ professionalId: item.id, slot: null })}
                  label={ownerFullName(item)}
                  detail={item.specialty}
                />
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
              {dates.map((item) => {
                const parts = dayParts(item);
                return (
                  <ChoiceButton
                    key={item}
                    selected={item === date}
                    onSelect={() => choose({ date: item, slot: null })}
                    ariaLabel={formatLongDate(item)}
                    className="items-center text-center"
                    label={parts.day}
                    detail={`${parts.weekday} · ${parts.month}`}
                  />
                );
              })}
            </div>
          )}

          {step === 5 && availability.status === "loading" && <LoadingState rows={2} />}
          {step === 5 && availability.status === "error" && (
            <ErrorState onRetry={() => setAvailabilityKey((key) => key + 1)} />
          )}
          {step === 5 && availability.status === "ready" && availability.data.slots.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
              {availability.data.slots.map((slot) => (
                <ChoiceButton
                  key={slot.startsAt}
                  selected={slot.startsAt === selection.slot?.startsAt}
                  onSelect={() => choose({ slot })}
                  className="items-center"
                  label={formatClinicTime(slot.startsAt)}
                />
              ))}
            </div>
          )}
          {step === 5 &&
            availability.status === "ready" &&
            availability.data.slots.length === 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-ink">No quedan horas libres ese día.</p>
                {availability.data.suggestedDates.length > 0 && (
                  <>
                    <p className="text-muted">Estos días sí tienen horas:</p>
                    <div className="flex flex-wrap gap-2">
                      {availability.data.suggestedDates.map((item) => (
                        <ChoiceButton
                          key={item}
                          selected={false}
                          onSelect={() => choose({ date: item, slot: null })}
                          label={formatLongDate(item)}
                        />
                      ))}
                    </div>
                  </>
                )}
                {availability.data.suggestedDates.length === 0 && (
                  <p className="text-muted">Prueba con otro día o con otro profesional.</p>
                )}
              </div>
            )}

          {stepError && (
            <p role="alert" className="text-sm text-danger">
              {stepError}
            </p>
          )}

          {!reviewing && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              {step > 1 ? (
                <Button variant="secondary" onClick={() => goTo((step - 1) as Step)}>
                  Atrás
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={handleNext}>{step < LAST_STEP ? "Siguiente" : "Revisar"}</Button>
            </div>
          )}
        </section>
      </div>

      {!reviewing && <BookingSummary rows={summaryRows} />}
    </div>
  );
}
