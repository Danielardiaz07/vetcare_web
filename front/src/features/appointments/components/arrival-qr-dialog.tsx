"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { appointmentErrorMessage } from "@/features/appointments/errors";
import { APPOINTMENT_TYPE_LABELS } from "@/features/staff/labels";
import { clinicDateOf, formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import { getCheckInCode, type CheckInCode } from "@/services/check-in";
import { APPOINTMENTS_CHANGED_EVENT } from "@/services/appointments";
import type { Appointment } from "@/types/domain";

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: CheckInCode };

export function ArrivalQrDialog({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const [state, setState] = useState<Load>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    setImageFailed(false);
    setCopyMessage("");
    getCheckInCode(appointment.id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: "error", message: appointmentErrorMessage(error) });
        }
      });
    return () => controller.abort();
  }, [appointment.id, appointment.startsAt, reloadKey]);

  useEffect(() => {
    const refresh = () => setReloadKey((key) => key + 1);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(APPOINTMENTS_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(APPOINTMENTS_CHANGED_EVENT, refresh);
    };
  }, []);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopyMessage("Código copiado");
    } catch {
      setCopyMessage("No se pudo copiar. Selecciona el código y cópialo.");
    }
  }

  const startsAt = state.status === "ready" ? state.data.startsAt : appointment.startsAt;

  return (
    <Modal open title="QR de llegada" onClose={onClose}>
      <div className="flex min-w-0 flex-col gap-4">
        <div>
          <p className="font-semibold text-ink">
            {appointment.patient.name} · {APPOINTMENT_TYPE_LABELS[appointment.type]}
          </p>
          <p className="text-sm text-muted first-letter:uppercase">
            {formatLongDate(clinicDateOf(new Date(startsAt)))} · {formatClinicTime(startsAt)}
          </p>
        </div>
        <p className="text-sm text-muted">
          Muéstralo en recepción el día de la cita. Si reprogramas, usa el QR nuevo.
        </p>
        {state.status === "loading" && <LoadingState />}
        {state.status === "error" && (
          <div className="flex flex-col items-start gap-3">
            <p role="alert" className="text-sm text-danger">
              No pudimos obtener el QR. {state.message}
            </p>
            <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
              Reintentar
            </Button>
            <p className="text-sm text-muted">Pide en recepción que registren tu llegada.</p>
          </div>
        )}
        {state.status === "ready" && (
          <>
            {imageFailed ? (
              <p role="alert" className="text-sm text-muted">
                No pudimos mostrar el QR. Usa el código.
              </p>
            ) : (
              <Image
                src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(state.data.qrSvg)}`}
                alt={`QR de llegada a la cita de ${appointment.patient.name}`}
                width={256}
                height={256}
                unoptimized
                loading="eager"
                onError={() => setImageFailed(true)}
                className="h-auto w-64 max-w-full self-center bg-white"
              />
            )}
            <Field
              label="Código de llegada"
              value={state.data.code}
              readOnly
              spellCheck={false}
              onFocus={(event) => event.currentTarget.select()}
              hint="Si no leen el QR, muestra este código."
              className="w-full min-w-0 text-base"
            />
            <Button variant="secondary" onClick={() => void copyCode(state.data.code)}>
              Copiar código
            </Button>
            <p role="status" className={copyMessage ? "text-sm text-muted" : "sr-only"}>
              {copyMessage}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
