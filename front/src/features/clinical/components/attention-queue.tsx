"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/features/auth/auth-provider";
import { AppointmentAttentionAction } from "@/features/clinical/components/appointment-attention-action";
import { ownerFullName } from "@/features/owners/labels";
import { APPOINTMENT_TYPE_LABELS } from "@/features/staff/labels";
import { clinicDateOf, formatClinicTime } from "@/lib/clinic-time";
import { getAgenda } from "@/services/appointments";
import type { Appointment } from "@/types/domain";

type State =
  { status: "loading" } | { status: "error" } | { status: "ready"; items: Appointment[] };

// RN-43: solo se atiende una cita Confirmada; la agenda ya trae solo las del profesional.
export function AttentionQueue() {
  const { user } = useAuth();
  const [state, setState] = useState<State>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [today] = useState(() => clinicDateOf(new Date()));

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    getAgenda({ from: today })
      .then((agenda) => {
        const items = agenda.filter((item) => item.status === "CONFIRMED");
        if (active) setState({ status: "ready", items });
      })
      .catch(() => {
        if (active) setState({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [today, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  if (state.status === "loading") return <LoadingState />;
  if (state.status === "error") return <ErrorState onRetry={reload} />;
  if (state.items.length === 0) {
    return (
      <EmptyState
        title="No hay pacientes en espera"
        description="Cuando recepción registre la llegada de una de tus citas de hoy, aparecerá aquí."
      />
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Pacientes que ya llegaron</h2>
      <ul className="flex flex-col gap-3">
        {state.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-surface p-5"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm text-subtle">
                {formatClinicTime(item.startsAt)} · {APPOINTMENT_TYPE_LABELS[item.type]}
              </span>
              <span className="font-semibold break-words text-ink">{item.patient.name}</span>
              {item.owner && (
                <span className="text-sm break-words text-muted">{ownerFullName(item.owner)}</span>
              )}
            </div>
            <AppointmentAttentionAction
              appointment={item}
              canStartAttention={user?.role === "VETERINARIAN"}
              label="Atender"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
