"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { clinicDateOf, formatLongDate } from "@/lib/clinic-time";
import { getCheckInCode, type CheckInCode } from "@/services/check-in";
import { ApiError } from "@/services/http-client";

// D-66, RN-83: el propietario muestra este QR en recepción el día de la cita. Cambia si la cita se reprograma.
export function CheckInQr({
  appointmentId,
  startsAt,
}: {
  appointmentId: string;
  startsAt: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<CheckInCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (open) return setOpen(false);
    setOpen(true);
    if (qr) return;
    setLoading(true);
    setError(null);
    try {
      setQr(await getCheckInCode(appointmentId));
    } catch (failure) {
      setError(
        failure instanceof ApiError
          ? failure.message
          : "No pudimos generar tu QR. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" className="self-start" loading={loading} onClick={toggle}>
        {open ? "Ocultar mi QR" : "Mostrar mi QR de llegada"}
      </Button>
      {open && error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {open && qr && (
        <div className="flex flex-col items-start gap-2">
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.qrSvg)}`}
            alt="Código QR de llegada a tu cita"
            width={200}
            height={200}
            className="rounded-control border border-line bg-white"
          />
          <p className="text-sm text-muted">
            Muéstralo en recepción al llegar. Solo vale el{" "}
            {formatLongDate(clinicDateOf(new Date(startsAt)))}. Si reprogramas la cita, tendrás un
            QR nuevo y este dejará de servir.
          </p>
        </div>
      )}
    </div>
  );
}
