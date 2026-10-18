"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { ConsultationForm } from "@/features/clinical/components/consultation-form";
import { PatientSummary } from "@/features/clinical/components/patient-summary";
import { ROUTES } from "@/lib/constants";
import { getAttentionContext, type AttentionContext } from "@/services/clinical";
import type { Appointment } from "@/types/domain";

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
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="lg:order-2">
        <PatientSummary
          appointment={data.appointment}
          patient={data.patient}
          consultations={data.consultations}
          vaccinations={data.vaccinations}
        />
      </div>
      <div className="lg:order-1">
        <ConsultationForm appointment={data.appointment} patient={data.patient} />
      </div>
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
