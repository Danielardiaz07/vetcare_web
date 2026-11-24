"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { appointmentErrorMessage } from "@/features/appointments/errors";
import { appointmentInProgressLabel } from "@/lib/appointment-status";
import { clinicDateOf } from "@/lib/clinic-time";
import { ROUTES } from "@/lib/constants";
import { startAppointmentAttention } from "@/services/appointments";
import type { Appointment } from "@/types/domain";

export function AppointmentAttentionAction({
  appointment,
  canStartAttention,
  label = "Registrar atención",
}: {
  appointment: Appointment;
  canStartAttention: boolean;
  label?: string;
}) {
  const router = useRouter();
  const mounted = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { id, startsAt, status, clinicalRecord, type } = appointment;
  const pendingResults =
    status === "ATTENDED" &&
    clinicalRecord?.kind === "LAB_EXAM" &&
    clinicalRecord.status === "PENDING_RESULTS";
  const inProgress = appointmentInProgressLabel(appointment);
  const href = `${ROUTES.panelAppointmentAttention(id)}?date=${clinicDateOf(new Date(startsAt))}`;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await startAppointmentAttention(id);
      if (mounted.current) router.push(href);
    } catch (failure) {
      if (mounted.current) {
        setError(appointmentErrorMessage(failure));
        setBusy(false);
      }
    }
  }

  if (status !== "CONFIRMED" && !pendingResults) return null;
  if (canStartAttention && !inProgress && !pendingResults) {
    return (
      <div className="flex flex-col items-start gap-2">
        <Button loading={busy} onClick={start}>
          {type === "SURGERY" ? "Iniciar cirugía" : label}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex min-h-11 w-fit items-center justify-center rounded-control bg-brand-600 px-5 font-medium text-white transition-colors duration-150 ease-out hover:bg-brand-700"
    >
      {pendingResults ? "Cargar resultados" : inProgress ? "Continuar atención" : label}
    </Link>
  );
}
