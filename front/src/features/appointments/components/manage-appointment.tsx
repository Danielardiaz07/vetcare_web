"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { BookingDetails } from "@/features/appointments/components/booking-details";
import { RescheduleForm } from "@/features/appointments/components/reschedule-form";
import { appointmentErrorMessage, isSlotTaken } from "@/features/appointments/errors";
import { ownerFullName } from "@/features/owners/labels";
import { APPOINTMENT_TYPE_LABELS } from "@/features/staff/labels";
import { APPOINTMENT_STATUS } from "@/lib/appointment-status";
import { clinicDateOf, formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import { FIELD_LIMITS } from "@/lib/constants";
import {
  cancelManagedAppointment,
  getManagedAppointment,
  getManagedAvailability,
  rescheduleManagedAppointment,
  type ManagedAppointment,
} from "@/services/appointment-links";
import { ApiError } from "@/services/http-client";

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ManagedAppointment };

export function ManageAppointment({ token }: { token: string }) {
  const [state, setState] = useState<Load>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [mode, setMode] = useState<"summary" | "reschedule" | "cancel">("summary");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const submittingRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    getManagedAppointment(token, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: "ready", data });
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          failure instanceof ApiError && failure.status === 404
            ? "Este enlace no está disponible. Revisa el enlace del correo o comunícate con la clínica."
            : appointmentErrorMessage(failure);
        setState({ status: "error", message });
      });
    return () => controller.abort();
  }, [token, reloadKey]);

  function refresh() {
    setMode("summary");
    setError(null);
    setReloadKey((key) => key + 1);
  }

  function recover(failure: unknown) {
    if (
      failure instanceof ApiError &&
      [404, 409].includes(failure.status) &&
      !isSlotTaken(failure)
    ) {
      refresh();
    }
    setError(appointmentErrorMessage(failure));
  }

  async function saveReschedule(startsAt: string) {
    setBusy(true);
    try {
      const data = await rescheduleManagedAppointment(token, startsAt);
      setState({ status: "ready", data });
      return data.appointment;
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        [404, 409].includes(failure.status) &&
        !isSlotTaken(failure)
      ) {
        recover(failure);
      }
      throw failure;
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (submittingRef.current || state.status !== "ready" || !state.data.canChange) return;
    submittingRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const data = await cancelManagedAppointment(token, reason);
      setState({ status: "ready", data });
      setMode("summary");
      setNotice("Cita cancelada. El horario quedó libre.");
    } catch (failure) {
      recover(failure);
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-5">
      <h1 className="text-2xl font-semibold text-ink">Gestionar cita</h1>
      {state.status === "loading" && <LoadingState rows={2} />}
      {state.status === "error" && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-danger">
            {state.message}
          </p>
          <Button variant="secondary" onClick={refresh}>
            Reintentar
          </Button>
        </div>
      )}
      {state.status === "ready" && (
        <>
          <div className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-ink">
                {state.data.appointment.patient.name}
              </h2>
              <StatusBadge tone={APPOINTMENT_STATUS[state.data.appointment.status].tone}>
                {APPOINTMENT_STATUS[state.data.appointment.status].label}
              </StatusBadge>
            </div>
            <BookingDetails
              rows={[
                { label: "Servicio", value: APPOINTMENT_TYPE_LABELS[state.data.appointment.type] },
                { label: "Profesional", value: ownerFullName(state.data.appointment.professional) },
                {
                  label: "Fecha",
                  value: formatLongDate(clinicDateOf(new Date(state.data.appointment.startsAt))),
                },
                { label: "Hora", value: formatClinicTime(state.data.appointment.startsAt) },
              ]}
            />
          </div>
          {notice && (
            <p role="status" className="text-success">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {!state.data.canChange && (
            <p className="text-muted">
              {state.data.blockedReason ?? "Esta cita ya no admite cambios."}
            </p>
          )}
          {state.data.canChange && mode === "summary" && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => {
                  setMode("reschedule");
                  setError(null);
                  setNotice("");
                }}
              >
                Reprogramar
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setMode("cancel");
                  setError(null);
                  setNotice("");
                }}
              >
                Cancelar cita
              </Button>
            </div>
          )}
          {state.data.canChange && mode === "reschedule" && (
            <RescheduleForm
              appointment={state.data.appointment}
              loadAvailability={getManagedAvailability}
              onSave={saveReschedule}
              onCancel={() => setMode("summary")}
              onRescheduled={() => {
                setMode("summary");
                setError(null);
                setNotice("Cita reprogramada. La nueva fecha aparece arriba.");
              }}
            />
          )}
          {state.data.canChange && mode === "cancel" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void cancel();
              }}
              className="flex flex-col gap-4 border-t border-line pt-4"
            >
              <h2 className="text-lg font-semibold text-ink">¿Cancelar esta cita?</h2>
              <p className="text-muted">El horario quedará libre para otra persona.</p>
              <Textarea
                label="Motivo (opcional)"
                maxLength={FIELD_LIMITS.APPOINTMENT_REASON_MAX}
                value={reason}
                readOnly={busy}
                onChange={(event) => setReason(event.target.value)}
              />
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="secondary" disabled={busy} onClick={() => setMode("summary")}>
                  Mantener cita
                </Button>
                <Button variant="danger" type="submit" loading={busy}>
                  Sí, cancelar cita
                </Button>
              </div>
            </form>
          )}
          <Button variant="secondary" disabled={busy} className="self-start" onClick={refresh}>
            Actualizar información
          </Button>
        </>
      )}
    </section>
  );
}
