"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { BookingReceipt } from "@/features/appointments/components/booking-receipt";
import { ChoiceButton } from "@/features/appointments/components/choice-button";
import { DateTimeAvailability } from "@/features/appointments/components/date-time-availability";
import { ReviewStep } from "@/features/appointments/components/review-step";
import {
  appointmentErrorMessage,
  isSlotTaken,
  SLOT_TAKEN_MESSAGE,
} from "@/features/appointments/errors";
import { useAuth } from "@/features/auth/auth-provider";
import { homeRouteFor } from "@/features/auth/redirects";
import { useLandingBooking } from "@/features/landing/booking-context";
import {
  ANY_PROFESSIONAL,
  emptyBookingDraft,
  NEW_PET,
  useBookingDraft,
} from "@/features/landing/use-booking-draft";
import { ownerFullName } from "@/features/owners/labels";
import { PatientForm } from "@/features/patients/components/patient-form";
import { SEX_LABELS, SPECIES_LABELS, SPECIES_OPTIONS } from "@/features/patients/labels";
import { patientSchema, type PatientFormInput } from "@/features/patients/schemas";
import { APPOINTMENT_TYPE_LABELS, durationLabel } from "@/features/staff/labels";
import { bookableDates, clinicDateOf, formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import { FIELD_LIMITS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { createAppointment, getAvailability, listProfessionals } from "@/services/appointments";
import { createMyPatient, getMyPatients } from "@/services/patients";
import { listAppointmentTypes } from "@/services/staff";
import type { Appointment, AppointmentTypeSetting, Patient, Professional } from "@/types/domain";

type Load<T> = { status: "loading" | "ready" | "error"; items: T[]; key?: string };
type Phase = "form" | "pet" | "review";
type GuestPet = Pick<PatientFormInput, "name" | "species">;
const guestSchema = patientSchema.pick({ name: true, species: true });
const normalizedPetName = (name: string) =>
  name.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");

export function LandingBookingForm() {
  const { user, status } = useAuth();
  const ownerId = user?.role === "OWNER" ? user.id : null;
  const { type: requestedType, requestKey, openLogin } = useLandingBooking();
  const { draft, setDraft } = useBookingDraft();
  const [types, setTypes] = useState<Load<AppointmentTypeSetting>>({
    status: "loading",
    items: [],
  });
  const [professionals, setProfessionals] = useState<Load<Professional>>({
    status: "loading",
    items: [],
  });
  const [pets, setPets] = useState<Load<Patient>>({ status: "loading", items: [] });
  const [reload, setReload] = useState(0);
  const [phase, setPhase] = useState<Phase>("form");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const restored = useRef(false);
  const {
    register,
    reset,
    trigger,
    formState: { errors },
  } = useForm<GuestPet>({ resolver: zodResolver(guestSchema) });

  useEffect(() => {
    if (!draft || restored.current) return;
    restored.current = true;
    reset({ name: draft.petName, species: draft.species ?? undefined });
  }, [draft, reset]);

  useEffect(() => {
    if (status === "loading") return;
    let active = true;
    setTypes({ status: "loading", items: [] });
    listAppointmentTypes()
      .then((items) => {
        if (active) setTypes({ status: "ready", items });
      })
      .catch(() => {
        if (active) setTypes({ status: "error", items: [] });
      });
    return () => {
      active = false;
    };
  }, [reload, status]);

  const selectedType = draft?.type;
  useEffect(() => {
    if (!selectedType) return;
    let active = true;
    setProfessionals({ status: "loading", items: [], key: selectedType });
    listProfessionals(selectedType, !ownerId)
      .then((items) => {
        if (active) setProfessionals({ status: "ready", items, key: selectedType });
      })
      .catch(() => {
        if (active) setProfessionals({ status: "error", items: [], key: selectedType });
      });
    return () => {
      active = false;
    };
  }, [selectedType, reload, ownerId]);

  useEffect(() => {
    if (!ownerId) return;
    let active = true;
    setPets({ status: "loading", items: [], key: ownerId });
    getMyPatients()
      .then((items) => {
        if (active)
          setPets({ status: "ready", items: items.filter((pet) => pet.active), key: ownerId });
      })
      .catch(() => {
        if (active) setPets({ status: "error", items: [], key: ownerId });
      });
    return () => {
      active = false;
    };
  }, [ownerId, reload]);

  const draftReady = draft !== null;
  useEffect(() => {
    if (requestedType && draftReady) {
      setDraft((current) =>
        current && current.type !== requestedType
          ? { ...current, type: requestedType, professionalId: null, slot: null }
          : current,
      );
      setPhase("form");
      setError(null);
      setConfirmed(null);
    }
  }, [requestedType, requestKey, draftReady, setDraft]);

  useEffect(() => {
    if (!draft || status === "loading") return;
    if (draft.userId !== ownerId) {
      setDraft((current) => current && { ...current, userId: ownerId, petId: null });
      setConfirmed(null);
      setReason("");
      setPhase("form");
      return;
    }
    if (ownerId && draft.resumeReview) {
      if (pets.key !== ownerId || pets.status === "loading") return;
      if (pets.status === "error") {
        setPhase("pet");
        return;
      }
      if (
        types.status !== "ready" ||
        professionals.status !== "ready" ||
        professionals.key !== draft.type
      )
        return;
      const matches = pets.items.filter(
        (item) =>
          item.species === draft.species &&
          normalizedPetName(item.name) === normalizedPetName(draft.petName),
      );
      const match = matches.length === 1 ? matches[0] : undefined;
      setDraft(
        (current) =>
          current && {
            ...current,
            petId: match?.id ?? (matches.length === 0 ? NEW_PET : null),
            resumeReview: false,
          },
      );
      setPhase(match ? "review" : "pet");
    }
  }, [
    draft,
    ownerId,
    status,
    pets,
    types.status,
    professionals.status,
    professionals.key,
    setDraft,
  ]);

  useEffect(() => {
    if (phase !== "form") headingRef.current?.focus({ preventScroll: true });
  }, [phase]);

  if (!draft || status === "loading") return <LoadingState rows={3} />;

  if (user && user.role !== "OWNER") {
    return (
      <div className="rounded-card bg-surface p-6 shadow-soft">
        <h3 className="text-lg font-semibold">Las citas en línea son para propietarios</h3>
        <p className="mt-2 text-muted">
          Con tu cuenta del equipo, agenda desde el panel a nombre del propietario.
        </p>
        <Link
          href={homeRouteFor(user.role)}
          className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-700 underline"
        >
          Ir al panel
        </Link>
      </div>
    );
  }

  const dates = bookableDates();
  const today = clinicDateOf(new Date());
  if (!dates.includes(today)) dates.unshift(today);
  const mine = pets.key === ownerId ? pets.items : [];
  const pet = mine.find((item) => item.id === draft.petId);
  const profiles = professionals.key === draft.type ? professionals.items : [];
  const professional = profiles.find((item) => item.id === draft.professionalId);
  const setting = types.items.find((item) => item.type === draft.type);
  const professionalLabel = draft.type === "GROOMING" ? "Estilista" : "Veterinario";
  const professionalName =
    draft.professionalId === ANY_PROFESSIONAL
      ? "Cualquiera disponible"
      : professional
        ? ownerFullName(professional)
        : "Por elegir";
  const petName = pet?.name ?? draft.petName.trim();
  const hasNewPet =
    !user ||
    draft.petId === NEW_PET ||
    (pets.status === "ready" && pets.key === ownerId && mine.length === 0);

  function edit() {
    setPhase("form");
    setError(null);
  }

  function markPet(saved: Patient) {
    reset({ name: saved.name, species: saved.species });
    setPets((current) => ({
      ...current,
      key: ownerId ?? undefined,
      items: [...current.items.filter((item) => item.id !== saved.id), saved],
      status: "ready",
    }));
    setDraft(
      (current) =>
        current && { ...current, petId: saved.id, petName: saved.name, species: saved.species },
    );
    setPhase("review");
  }

  async function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (user && !pet && !hasNewPet) {
      setError("Elige una mascota de tu cuenta o registra una nueva para continuar.");
      return;
    }
    if (hasNewPet && !(await trigger())) return;
    if (!setting || !draft?.professionalId || !draft.slot) {
      setError("Elige el tipo de cita, el profesional y una hora disponible para continuar.");
      return;
    }
    if (draft.professionalId !== ANY_PROFESSIONAL && !professional) {
      setError("Elige un profesional activo para continuar.");
      return;
    }
    if (!user) {
      setDraft((current) => current && { ...current, resumeReview: true });
      openLogin();
      return;
    }
    setPhase(pet ? "review" : "pet");
  }

  async function confirm(text: string) {
    if (!draft?.slot || !draft.type || !draft.professionalId || !pet || !ownerId) return;
    setReason(text);
    setError(null);
    const params = {
      type: draft.type,
      date: draft.date,
      ...(draft.professionalId !== ANY_PROFESSIONAL && { professionalId: draft.professionalId }),
    };
    try {
      const available = await getAvailability(params);
      if (!available.slots.some((item) => item.startsAt === draft.slot?.startsAt)) {
        setDraft((current) => current && { ...current, slot: null });
        setRefreshKey((key) => key + 1);
        setPhase("form");
        setError(SLOT_TAKEN_MESSAGE);
        return;
      }
      const appointment = await createAppointment({
        patientId: pet.id,
        type: draft.type,
        startsAt: draft.slot.startsAt,
        ...(params.professionalId && { professionalId: params.professionalId }),
        ...(text && { reason: text }),
      });
      setConfirmed(appointment);
      setDraft({ ...emptyBookingDraft(), userId: ownerId });
    } catch (cause) {
      if (isSlotTaken(cause)) {
        setDraft((current) => current && { ...current, slot: null });
        setRefreshKey((key) => key + 1);
        setPhase("form");
        setError(SLOT_TAKEN_MESSAGE);
      } else {
        setError(appointmentErrorMessage(cause));
      }
    }
  }

  if (confirmed)
    return (
      <BookingReceipt
        appointment={confirmed}
        onBookAnother={() => {
          setConfirmed(null);
          setPhase("form");
          setError(null);
          setReason("");
          reset({ name: "", species: undefined });
        }}
      />
    );

  const errorNotice = error && (
    <p
      role="alert"
      className="rounded-control border border-danger-border bg-danger-bg p-3 text-sm text-danger"
    >
      {error}
    </p>
  );
  const retry = (
    <Button variant="secondary" onClick={() => setReload((key) => key + 1)}>
      Reintentar
    </Button>
  );

  if (phase === "review" && pet && setting && draft.slot) {
    return (
      <section className="rounded-card bg-surface p-5 shadow-soft sm:p-6">
        <h3 ref={headingRef} tabIndex={-1} className="mb-5 text-xl font-semibold outline-none">
          Revisa tu cita
        </h3>
        <ReviewStep
          rows={[
            { label: "Mascota", value: `${pet.name} · ${SPECIES_LABELS[pet.species]}` },
            {
              label: "Tipo de cita",
              value: `${APPOINTMENT_TYPE_LABELS[setting.type]} · ${durationLabel(setting.durationMinutes)}`,
            },
            { label: professionalLabel, value: professionalName },
            { label: "Fecha", value: formatLongDate(draft.date) },
            { label: "Hora", value: formatClinicTime(draft.slot.startsAt) },
          ]}
          defaultReason={reason}
          error={error}
          onBack={(text) => {
            setReason(text);
            edit();
          }}
          onConfirm={confirm}
        />
      </section>
    );
  }

  const matchingPets = mine.filter(
    (item) =>
      item.species === draft.species &&
      normalizedPetName(item.name) === normalizedPetName(draft.petName),
  );
  const ambiguous = phase === "pet" && matchingPets.length > 1 && draft.petId !== NEW_PET;
  const choices = ambiguous ? matchingPets : mine;
  const petChoices = (
    <div role="group" aria-label="Mascotas registradas" className="grid gap-2 sm:grid-cols-2">
      {choices.map((item) => (
        <ChoiceButton
          key={item.id}
          selected={draft.petId === item.id}
          label={item.name}
          detail={`${SPECIES_LABELS[item.species]} · ${item.breed} · ${SEX_LABELS[item.sex]} · ${formatDate(item.birthDate)}`}
          onSelect={() => {
            setDraft((current) => current && { ...current, petId: item.id });
            setError(null);
          }}
        />
      ))}
      {!ambiguous && (
        <ChoiceButton
          selected={draft.petId === NEW_PET}
          label="Registrar una nueva mascota"
          onSelect={() => setDraft((current) => current && { ...current, petId: NEW_PET })}
        />
      )}
    </div>
  );

  if (phase === "pet") {
    return (
      <section className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-soft sm:p-6">
        <h3 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
          {draft.petId === NEW_PET ? "Completa la ficha de tu mascota" : "Elige tu mascota"}
        </h3>
        <p className="text-sm text-muted">
          {ambiguous
            ? "Tienes más de una mascota con ese nombre y especie. Elige la correcta para continuar."
            : "Conservamos los datos de tu cita. Completa la ficha de tu mascota para pasar al resumen y confirmar."}
        </p>
        {pets.status === "loading" || pets.key !== ownerId ? (
          <LoadingState rows={2} />
        ) : pets.status === "error" ? (
          <>
            {errorNotice}
            <p role="alert">No pudimos cargar tus mascotas.</p>
            {retry}
          </>
        ) : (
          <>
            {draft.petId === NEW_PET || mine.length === 0 ? (
              <PatientForm
                initialValues={{
                  name: draft.petName,
                  ...(draft.species && { species: draft.species }),
                }}
                createMine={createMyPatient}
                onCancel={edit}
                onSaved={markPet}
              />
            ) : (
              <>
                {petChoices}
                <div className="flex flex-wrap justify-between gap-3">
                  <Button variant="secondary" onClick={edit}>
                    Volver
                  </Button>
                  <Button disabled={!pet} onClick={() => setPhase("review")}>
                    Revisar cita
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </section>
    );
  }

  return (
    <form
      onSubmit={(event) => void review(event)}
      noValidate
      className="@container flex flex-col gap-7 rounded-card bg-surface p-5 shadow-soft sm:p-6"
    >
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="mb-3 font-semibold">1. ¿Para quién es la cita?</legend>
        {user && (pets.status === "loading" || pets.key !== ownerId) ? (
          <LoadingState rows={1} />
        ) : user && pets.status === "error" ? (
          <>
            <p role="alert" className="text-sm text-danger">
              No pudimos cargar tus mascotas.
            </p>
            {retry}
          </>
        ) : (
          user && <>{petChoices}</>
        )}
        {hasNewPet && (
          <div className="grid items-start gap-3 @min-[28rem]:grid-cols-2">
            <Field
              label="Nombre de tu mascota"
              placeholder="Ej.: Luna"
              maxLength={FIELD_LIMITS.PATIENT_NAME_MAX}
              error={errors.name?.message}
              {...register("name", {
                onChange: (event) =>
                  setDraft((current) => current && { ...current, petName: event.target.value }),
              })}
            />
            <Select
              label="Especie"
              error={errors.species?.message}
              defaultValue=""
              {...register("species", {
                onChange: (event) =>
                  setDraft(
                    (current) => current && { ...current, species: event.target.value || null },
                  ),
              })}
            >
              <option value="" disabled>
                Elige la especie
              </option>
              {SPECIES_OPTIONS.map((item) => (
                <option key={item} value={item}>
                  {SPECIES_LABELS[item]}
                </option>
              ))}
            </Select>
          </div>
        )}
        {!user && (
          <p className="text-sm text-muted">
            ¿Ya tienes cuenta?{" "}
            <button
              type="button"
              onClick={() => {
                setDraft((current) => current && { ...current, resumeReview: false });
                openLogin();
              }}
              className="inline-flex min-h-11 items-center font-medium text-brand-700 underline"
            >
              Inicia sesión
            </button>{" "}
            para elegir una mascota registrada.
          </p>
        )}
      </fieldset>
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="mb-3 font-semibold">2. Tipo de cita</legend>
        {types.status === "loading" ? (
          <LoadingState rows={1} />
        ) : types.status === "error" ? (
          <>
            <p role="alert" className="text-sm text-danger">
              No pudimos cargar los tipos de cita.
            </p>
            {retry}
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {types.items.map((item) => (
              <ChoiceButton
                key={item.type}
                selected={item.type === draft.type}
                label={APPOINTMENT_TYPE_LABELS[item.type]}
                detail={durationLabel(item.durationMinutes)}
                onSelect={() => {
                  setDraft(
                    (current) =>
                      current && { ...current, type: item.type, professionalId: null, slot: null },
                  );
                  setError(null);
                }}
              />
            ))}
          </div>
        )}
      </fieldset>
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="mb-3 font-semibold">
          3. {draft.type ? professionalLabel : "Profesional"}
        </legend>
        {!draft.type ? (
          <p className="text-sm text-muted">
            Elige un tipo de cita para consultar los profesionales activos.
          </p>
        ) : professionals.key !== draft.type || professionals.status === "loading" ? (
          <LoadingState rows={1} />
        ) : professionals.status === "error" ? (
          <>
            <p role="alert" className="text-sm text-danger">
              No pudimos cargar los profesionales.
            </p>
            {retry}
          </>
        ) : profiles.length === 0 ? (
          <p className="text-sm text-muted">
            No hay profesionales disponibles para este tipo de cita.
          </p>
        ) : (
          <div className="grid gap-2 @min-[28rem]:grid-cols-2">
            <ChoiceButton
              label="Cualquiera disponible"
              selected={draft.professionalId === ANY_PROFESSIONAL}
              onSelect={() =>
                setDraft(
                  (current) =>
                    current && { ...current, professionalId: ANY_PROFESSIONAL, slot: null },
                )
              }
            />
            {profiles.map((item) => (
              <ChoiceButton
                key={item.id}
                selected={draft.professionalId === item.id}
                label={ownerFullName(item)}
                detail={item.specialty}
                onSelect={() =>
                  setDraft(
                    (current) => current && { ...current, professionalId: item.id, slot: null },
                  )
                }
              />
            ))}
          </div>
        )}
      </fieldset>
      <fieldset className="min-w-0">
        <legend className="mb-3 font-semibold">4. Fecha y hora</legend>
        {draft.type && draft.professionalId ? (
          <DateTimeAvailability
            type={draft.type}
            {...(draft.professionalId !== ANY_PROFESSIONAL && {
              professionalId: draft.professionalId,
            })}
            dates={dates}
            date={draft.date}
            slot={draft.slot}
            refreshKey={refreshKey}
            onChange={(date, slot) => {
              setDraft(
                (current) =>
                  current && {
                    ...current,
                    date,
                    slot: slot && { startsAt: slot.startsAt, endsAt: slot.endsAt },
                  },
              );
              setError(null);
            }}
          />
        ) : (
          <div className="grid items-start gap-5 @min-[30rem]:grid-cols-2">
            <DatePicker
              variant="inline"
              label="Fecha"
              value={draft.date}
              min={dates[0]}
              max={dates.at(-1)}
              onChange={(date) =>
                setDraft((current) => current && { ...current, date, slot: null })
              }
            />
            <p className="text-sm text-muted">
              Elige el tipo de cita y el profesional para consultar las horas disponibles.
            </p>
          </div>
        )}
      </fieldset>
      {errorNotice}
      <div className="flex flex-col gap-3 border-t border-line pt-4">
        <p className="text-sm leading-relaxed text-muted">
          <strong className="font-semibold text-ink">{petName || "Mascota por elegir"}</strong>
          {setting && ` · ${APPOINTMENT_TYPE_LABELS[setting.type]}`} · {professionalName} ·{" "}
          {formatLongDate(draft.date)}
          {draft.slot && ` · ${formatClinicTime(draft.slot.startsAt)}`}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-subtle">
            {user
              ? "Revisa los datos antes de confirmar."
              : "Inicia sesión o crea tu cuenta al continuar."}
          </p>
          <Button type="submit">Revisar cita</Button>
        </div>
      </div>
    </form>
  );
}
