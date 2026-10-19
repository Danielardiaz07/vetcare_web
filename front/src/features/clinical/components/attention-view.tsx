"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ConsultationForm } from "@/features/clinical/components/consultation-form";
import { PatientSummary } from "@/features/clinical/components/patient-summary";
import { VaccinationForm } from "@/features/clinical/components/vaccination-form";
import { ROUTES } from "@/lib/constants";
import {
  getAttentionContext,
  getVaccinationCard,
  type AttentionContext,
} from "@/services/clinical";
import type { Appointment } from "@/types/domain";

type Tab = "consultation" | "vaccination";

const TABS: { value: Tab; label: string }[] = [
  { value: "consultation", label: "Consulta" },
  { value: "vaccination", label: "Vacunación" },
];

const tabId = (tab: Tab) => `attention-tab-${tab}`;
const panelId = (tab: Tab) => `attention-panel-${tab}`;

type State =
  { status: "loading" } | { status: "error" } | { status: "loaded"; data: AttentionContext };

type AttentionViewProps = {
  appointmentId: string;
  // Día de la cita (AAAA-MM-DD), para buscarla en la agenda.
  date: string;
};

export function AttentionView({ appointmentId, date }: AttentionViewProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    getAttentionContext(appointmentId, date)
      .then((data) => {
        if (active) setState({ status: "loaded", data });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [appointmentId, date, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState onRetry={reload} />;

  const { data } = state;
  if (data.status === "not-found") {
    return (
      <Unavailable
        title="Esta cita no está en tu agenda"
        description="Solo el veterinario asignado a la cita puede registrar la atención."
      />
    );
  }
  if (data.status === "not-confirmed") return <NotConfirmed appointment={data.appointment} />;

  return (
    <AttentionTabs
      context={data}
      onContextChange={(next) => setState({ status: "loaded", data: next })}
    />
  );
}

type ReadyContext = Extract<AttentionContext, { status: "ready" }>;

type AttentionTabsProps = {
  context: ReadyContext;
  onContextChange: (context: ReadyContext) => void;
};

// Una cita de Vacunación abre en su pestaña; las dos quedan montadas para no perder lo escrito.
function AttentionTabs({ context, onContextChange }: AttentionTabsProps) {
  const { appointment, patient } = context;
  const [tab, setTab] = useState<Tab>(
    appointment.type === "VACCINATION" ? "vaccination" : "consultation",
  );

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = TABS.find((item) => item.value !== tab)?.value ?? tab;
    setTab(next);
    document.getElementById(tabId(next))?.focus();
  }

  // El carné del resumen se actualiza con la vacuna recién aplicada (RN-49).
  async function refreshVaccinations() {
    try {
      onContextChange({ ...context, vaccinations: await getVaccinationCard(patient.id) });
    } catch {
      // Si falla, el carné se queda como estaba; la vacuna ya quedó guardada.
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="lg:order-2">
        <PatientSummary
          appointment={appointment}
          patient={patient}
          consultations={context.consultations}
          vaccinations={context.vaccinations}
        />
      </div>
      <section className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5 lg:order-1">
        <div role="tablist" aria-label="Atención" className="flex gap-2">
          {TABS.map((item) => {
            const selected = item.value === tab;
            return (
              <button
                key={item.value}
                id={tabId(item.value)}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={panelId(item.value)}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(item.value)}
                onKeyDown={handleTabKey}
                className={cn(
                  "min-h-11 rounded-control border px-4 font-semibold transition-colors duration-150 ease-out",
                  selected
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-field-border bg-surface text-ink hover:bg-brand-50",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <div
          id={panelId("consultation")}
          role="tabpanel"
          aria-labelledby={tabId("consultation")}
          hidden={tab !== "consultation"}
        >
          <ConsultationForm appointment={appointment} patient={patient} />
        </div>
        <div
          id={panelId("vaccination")}
          role="tabpanel"
          aria-labelledby={tabId("vaccination")}
          hidden={tab !== "vaccination"}
        >
          <VaccinationForm patient={patient} onRegistered={refreshVaccinations} />
        </div>
      </section>
    </div>
  );
}

// RN-43: solo se registra la atención de una cita Confirmada (con la llegada registrada).
function NotConfirmed({ appointment }: { appointment: Appointment }) {
  if (appointment.status === "SCHEDULED") {
    return (
      <Unavailable
        title="Falta registrar la llegada"
        description={`Recepción debe registrar la llegada de ${appointment.patient.name} antes de la atención.`}
      />
    );
  }
  if (appointment.status === "ATTENDED") {
    return (
      <Unavailable
        title="Esta cita ya fue atendida"
        description="La consulta ya quedó registrada en el historial de la mascota."
      />
    );
  }
  return (
    <Unavailable
      title={
        appointment.status === "CANCELLED"
          ? "Esta cita fue cancelada"
          : `${appointment.patient.name} no asistió a esta cita`
      }
      description="Solo se registra la atención de una cita confirmada."
    />
  );
}

function Unavailable({ title, description }: { title: string; description: string }) {
  return (
    <EmptyState
      title={title}
      description={description}
      action={
        <Link
          href={ROUTES.panelAgenda}
          className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-2"
        >
          Ir a Mi agenda
        </Link>
      }
    />
  );
}
