"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { Textarea } from "@/components/ui/textarea";
import { BookingReceipt } from "@/features/appointments/components/booking-receipt";
import { BookingSummary } from "@/features/appointments/components/booking-summary";
import { ChoiceButton } from "@/features/appointments/components/choice-button";
import { NewPetButton } from "@/features/appointments/components/new-pet-button";
import { ReviewStep } from "@/features/appointments/components/review-step";
import { DateTimeAvailability } from "@/features/appointments/components/date-time-availability";
import { ProcedureDurationField } from "@/features/appointments/components/procedure-duration-field";
import {
  appointmentErrorMessage,
  isActiveLimit,
  isSlotTaken,
  SLOT_TAKEN_MESSAGE,
} from "@/features/appointments/errors";
import { ownerFullName } from "@/features/owners/labels";
import { PatientForm } from "@/features/patients/components/patient-form";
import { SPECIES_LABELS } from "@/features/patients/labels";
import { APPOINTMENT_TYPE_LABELS, durationLabel } from "@/features/staff/labels";
import {
  isProcedureAppointment,
  parseProcedureDuration,
  PROCEDURE_INSTRUCTIONS_MAX,
  PROCEDURE_NAME_MAX,
  PROCEDURE_TYPES,
} from "@/lib/appointment-procedures";
import { bookableDates, clinicDateOf, formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import { MAX_ACTIVE_APPOINTMENTS_PER_PATIENT, ROUTES } from "@/lib/constants";
import { calculateAge } from "@/lib/format";
import { createAppointment, listProfessionals } from "@/services/appointments";
import { createMyPatient, getMyPatients, listPatients } from "@/services/patients";
import { listAppointmentTypes } from "@/services/staff";
import type {
  Appointment,
  AppointmentType,
  AppointmentTypeSetting,
  AvailableSlot,
  Owner,
  Patient,
  Professional,
} from "@/types/domain";

// D-26: "Cualquiera disponible" no manda profesional y la API asigna el primero libre.
const ANY_PROFESSIONAL = "any";
const LAST_STEP = 4;
const REVIEW = "review";
const OWNER_PETS_LIMIT = 100;

type Step = 1 | 2 | 3 | 4;
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
  4: "un día y una hora",
};

function isChosen(step: Step, selection: Selection): boolean {
  const values: Record<Step, unknown> = {
    1: selection.petId,
    2: selection.type,
    3: selection.professionalId,
    4: selection.date && selection.slot,
  };
  return values[step] !== null;
}

function firstMissingStep(selection: Selection): Step {
  const steps: Step[] = [1, 2, 3, 4];
  return steps.find((step) => !isChosen(step, selection)) ?? LAST_STEP;
}

type AppointmentWizardProps = {
  initialPetId?: string;
  initialType?: string;
  owner?: Owner;
  onDone?: () => void;
};

async function ownerPets(ownerId: string): Promise<Patient[]> {
  const { data } = await listPatients({ page: 1, limit: OWNER_PETS_LIMIT, ownerId });
  return data.filter((pet) => pet.active);
}

export function AppointmentWizard({
  initialPetId,
  initialType,
  owner,
  onDone,
}: AppointmentWizardProps) {
  const [base, setBase] = useState<Loadable<BaseData>>({ status: "loading" });
  const [baseKey, setBaseKey] = useState(0);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [step, setStep] = useState<View>(1);
  const [creatingPet, setCreatingPet] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [procedureName, setProcedureName] = useState("");
  const [durationText, setDurationText] = useState("");
  const [validateDuration, setValidateDuration] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [bookingError, setBookingError] = useState<ReactNode>(null);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const [professionals, setProfessionals] = useState<Loadable<Professional[]>>({
    status: "loading",
  });
  const [professionalsKey, setProfessionalsKey] = useState(0);
  const [availabilityKey, setAvailabilityKey] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const movedByUser = useRef(false);
  const today = clinicDateOf(new Date());
  const dates = bookableDates();
  // Hoy sigue visible aunque la anticipación mínima deje todos sus horarios fuera del plazo.
  if (!dates.includes(today)) dates.unshift(today);

  useEffect(() => {
    let active = true;
    setBase({ status: "loading" });
    Promise.all([owner ? ownerPets(owner.id) : getMyPatients(), listAppointmentTypes()])
      .then(([pets, types]) => {
        if (!active) return;
        setBase({ status: "ready", data: { pets, types } });
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
  }, [baseKey, initialPetId, initialType, owner]);

  const { type, professionalId, date } = selection;
  const isProcedure = type !== null && isProcedureAppointment(type);

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

  // Al cambiar de paso, el lector de pantalla anuncia el título nuevo.
  useEffect(() => {
    if (movedByUser.current) headingRef.current?.focus();
  }, [step, creatingPet]);

  const restart = useCallback(() => {
    movedByUser.current = true;
    setConfirmed(null);
    setSelection(EMPTY_SELECTION);
    setReason("");
    setProcedureName("");
    setDurationText("");
    setValidateDuration(false);
    setInstructions("");
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

  if (confirmed) {
    return <BookingReceipt appointment={confirmed} onBookAnother={restart} onDone={onDone} />;
  }

  const { pets, types } = base.data;

  const pet = pets.find((item) => item.id === selection.petId);
  const setting = types.find((item) => item.type === type);
  const procedureDuration = parseProcedureDuration(durationText);
  const duration = isProcedure ? procedureDuration : setting?.durationMinutes;
  const professional =
    professionals.status === "ready"
      ? professionals.data.find((item) => item.id === professionalId)
      : undefined;
  const proTitle = professionalTitle(type);

  const stepTitles: Record<Step, string> = {
    1: "Mascota",
    2: "Tipo de cita",
    3: proTitle,
    4: "Fecha y hora",
  };

  function goTo(next: View) {
    movedByUser.current = true;
    setStepError(null);
    setBookingError(null);
    setStep(next);
  }

  function openPetForm() {
    movedByUser.current = true;
    setStepError(null);
    setCreatingPet(true);
  }

  function selectNewPet(saved: Patient) {
    setBase((current) =>
      current.status === "ready"
        ? { status: "ready", data: { ...current.data, pets: [...current.data.pets, saved] } }
        : current,
    );
    choose({ petId: saved.id });
    setCreatingPet(false);
  }

  function handleNext() {
    if (step === REVIEW) return;
    if (!isChosen(step, selection)) {
      const missing = step === 3 && isProcedure ? "un veterinario" : STEP_MISSING[step];
      setStepError(`Elige ${missing} para continuar.`);
      return;
    }
    if (step === 2 && isProcedure && (!procedureName.trim() || !procedureDuration)) {
      setValidateDuration(true);
      setStepError(procedureName.trim() ? null : "Escribe el nombre del procedimiento.");
      return;
    }
    if (step === 3 && (!date || !dates.includes(date))) {
      choose({ date: today, slot: null });
    }
    goTo(step < LAST_STEP ? ((step + 1) as Step) : REVIEW);
  }

  async function handleConfirm(text: string) {
    const { petId, slot } = selection;
    if (!petId || !type || !professionalId || !slot || (isProcedure && !procedureDuration)) return;
    setReason(text);
    setBookingError(null);
    try {
      const appointment = await createAppointment({
        patientId: petId,
        type,
        startsAt: slot.startsAt,
        ...(professionalId !== ANY_PROFESSIONAL && { professionalId }),
        ...(isProcedure
          ? {
              procedureName: procedureName.trim(),
              durationMinutes: procedureDuration,
              ...(instructions.trim() && { instructions: instructions.trim() }),
            }
          : text && { reason: text }),
      });
      setConfirmed(appointment);
    } catch (error) {
      if (isSlotTaken(error)) {
        goTo(LAST_STEP);
        choose({ slot: null });
        setStepError(SLOT_TAKEN_MESSAGE);
        setAvailabilityKey((key) => key + 1);
      } else if (isActiveLimit(error) && owner) {
        setBookingError(
          `Esta mascota ya tiene ${MAX_ACTIVE_APPOINTMENTS_PER_PATIENT} citas activas. Cancela una de ellas para agendar otra.`,
        );
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

  function chooseType(nextType: AppointmentType) {
    if (nextType === type) return;
    choose({ type: nextType, professionalId: null, slot: null });
    setProcedureName("");
    setDurationText("");
    setValidateDuration(false);
    setInstructions("");
  }

  const procedureRows = isProcedure
    ? [{ label: "Procedimiento", value: procedureName.trim() || null }]
    : [];

  const summaryRows = [
    { label: "Mascota", value: pet?.name ?? null },
    {
      label: "Tipo de cita",
      value: type
        ? `${APPOINTMENT_TYPE_LABELS[type]}${duration ? ` · ${durationLabel(duration)}` : ""}`
        : null,
    },
    ...procedureRows,
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
    type && duration && selection.slot
      ? [
          { label: "Mascota", value: pet?.name ?? "" },
          { label: "Tipo de cita", value: APPOINTMENT_TYPE_LABELS[type] },
          ...(isProcedure ? [{ label: "Procedimiento", value: procedureName.trim() }] : []),
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
          { label: "Duración", value: durationLabel(duration) },
          ...(isProcedure && instructions.trim()
            ? [{ label: "Indicaciones para el propietario", value: instructions.trim() }]
            : []),
        ]
      : [];
  const reviewing = step === REVIEW;

  return (
    <div
      className={cn(
        "grid items-start gap-6",
        !reviewing &&
          (step === 4
            ? "lg:grid-cols-[minmax(0,1fr)_16rem]"
            : "lg:grid-cols-[minmax(0,1fr)_18rem]"),
      )}
    >
      <div className="flex flex-col gap-5">
        <ol className="flex flex-wrap gap-2 text-sm" aria-label="Pasos para agendar">
          {([1, 2, 3, 4] as Step[]).map((item) => (
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
          className="@container flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
        >
          <h2
            id="wizard-step-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold text-ink outline-none"
          >
            {creatingPet
              ? "Nueva mascota"
              : reviewing
                ? `Revisa y confirma ${owner ? "la" : "tu"} cita`
                : `Paso ${step} de ${LAST_STEP} · ${stepTitles[step]}`}
          </h2>

          {reviewing && (
            <ReviewStep
              rows={reviewRows}
              defaultReason={reason}
              hideReason={isProcedure}
              error={bookingError}
              onBack={(text) => {
                setReason(text);
                goTo(LAST_STEP);
              }}
              onConfirm={handleConfirm}
            />
          )}

          {step === 1 &&
            (creatingPet ? (
              <PatientForm
                owner={owner}
                createMine={owner ? undefined : createMyPatient}
                onCancel={() => setCreatingPet(false)}
                onSaved={selectNewPet}
              />
            ) : (
              <>
                {pets.length > 0 ? (
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
                ) : (
                  <p className="text-muted">
                    {owner
                      ? "Este propietario aún no tiene mascotas activas."
                      : "Aún no tienes mascotas activas."}
                  </p>
                )}
                <NewPetButton onClick={openPetForm} />
              </>
            ))}

          {step === 2 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {types.map((item) => (
                  <ChoiceButton
                    key={item.type}
                    selected={item.type === type}
                    onSelect={() => chooseType(item.type)}
                    label={APPOINTMENT_TYPE_LABELS[item.type]}
                    detail={durationLabel(item.durationMinutes)}
                  />
                ))}
                {owner &&
                  PROCEDURE_TYPES.map((item) => (
                    <ChoiceButton
                      key={item}
                      selected={item === type}
                      onSelect={() => chooseType(item)}
                      label={APPOINTMENT_TYPE_LABELS[item]}
                    />
                  ))}
              </div>
              {isProcedure && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Nombre del procedimiento"
                    maxLength={PROCEDURE_NAME_MAX}
                    required
                    value={procedureName}
                    onChange={(event) => {
                      setProcedureName(event.target.value);
                      setStepError(null);
                    }}
                  />
                  <ProcedureDurationField
                    value={durationText}
                    showError={validateDuration}
                    onChange={(value) => {
                      setDurationText(value);
                      if (parseProcedureDuration(value) !== procedureDuration)
                        choose({ slot: null });
                    }}
                  />
                  <div className="sm:col-span-2">
                    <Textarea
                      label="Indicaciones para el propietario (opcional)"
                      maxLength={PROCEDURE_INSTRUCTIONS_MAX}
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {step === 3 && professionals.status === "loading" && <LoadingState rows={2} />}
          {step === 3 && professionals.status === "error" && (
            <ErrorState onRetry={() => setProfessionalsKey((key) => key + 1)} />
          )}
          {step === 3 && professionals.status === "ready" && (
            <div className="grid gap-3 sm:grid-cols-2">
              {!isProcedure && (
                <ChoiceButton
                  selected={professionalId === ANY_PROFESSIONAL}
                  onSelect={() => choose({ professionalId: ANY_PROFESSIONAL, slot: null })}
                  label="Cualquiera disponible"
                  detail={owner ? "Se asigna el primero libre" : "Te asignamos el primero libre"}
                />
              )}
              {isProcedure && professionals.data.length === 0 && (
                <p className="text-muted">No hay veterinarios activos para agendar.</p>
              )}
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

          {step === 4 && type && professionalId && (
            <DateTimeAvailability
              key={`${type}:${professionalId}`}
              type={type}
              professionalId={professionalId === ANY_PROFESSIONAL ? undefined : professionalId}
              durationMinutes={isProcedure ? procedureDuration : undefined}
              dates={dates}
              date={date}
              slot={selection.slot}
              refreshKey={availabilityKey}
              onChange={(nextDate, slot) => choose({ date: nextDate, slot })}
            />
          )}

          {stepError && (
            <p role="alert" className="text-sm text-danger">
              {stepError}
            </p>
          )}

          {!reviewing && !creatingPet && (step !== 1 || pets.length > 0) && (
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
