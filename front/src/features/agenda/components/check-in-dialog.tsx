"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { MobileScannerAccess } from "@/features/agenda/components/mobile-scanner-access";
import { BookingDetails } from "@/features/appointments/components/booking-details";
import { appointmentErrorMessage } from "@/features/appointments/errors";
import { ownerFullName } from "@/features/owners/labels";
import { APPOINTMENT_TYPE_LABELS } from "@/features/staff/labels";
import { clinicDateOf, formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import { CHECK_IN_CODE_MAX, registerCheckIn } from "@/services/check-in";
import type { Appointment } from "@/types/domain";

export function CheckInDialog({
  open,
  onClose,
  onRegistered,
}: {
  open: boolean;
  onClose: () => void;
  onRegistered: (appointment: Appointment, message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [registered, setRegistered] = useState<Appointment | null>(null);
  const [mode, setMode] = useState<"mobile" | "code">("mobile");

  useEffect(() => {
    if (submittingRef.current) return;
    setCode("");
    setError(undefined);
    setRegistered(null);
    setMode("mobile");
  }, [open]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    if (!code.trim()) {
      setError("Ingresa el código de llegada.");
      inputRef.current?.focus();
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const appointment = await registerCheckIn(code);
      setRegistered(appointment);
      onRegistered(appointment, `Llegada registrada: ${appointment.patient.name}`);
    } catch (error: unknown) {
      setError(appointmentErrorMessage(error));
      inputRef.current?.focus();
      inputRef.current?.select();
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Registrar llegada con QR" onClose={onClose}>
      {!registered && (
        <div
          role="group"
          aria-label="Forma de registrar llegada"
          className="grid grid-cols-2 gap-2"
        >
          {(
            [
              { value: "mobile", label: "Desde el celular" },
              { value: "code", label: "Con código" },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={mode === item.value}
              disabled={busy}
              onClick={() => setMode(item.value)}
              className={cn(
                "min-h-11 rounded-control border px-3 text-sm font-semibold transition-colors duration-150 ease-out disabled:cursor-not-allowed disabled:opacity-60",
                mode === item.value
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-field-border bg-surface text-ink hover:bg-brand-50",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {registered ? (
        <div className="flex min-w-0 flex-col gap-4">
          <div role="status" className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink">Llegada registrada</p>
            <StatusBadge tone="success">Confirmada</StatusBadge>
          </div>
          <BookingDetails
            rows={[
              { label: "Mascota", value: registered.patient.name },
              ...(registered.owner
                ? [{ label: "Propietario", value: ownerFullName(registered.owner) }]
                : []),
              { label: "Tipo de cita", value: APPOINTMENT_TYPE_LABELS[registered.type] },
              { label: "Profesional", value: ownerFullName(registered.professional) },
              {
                label: "Fecha",
                value: formatLongDate(clinicDateOf(new Date(registered.startsAt))),
              },
              { label: "Hora", value: formatClinicTime(registered.startsAt) },
            ]}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setCode("");
                setRegistered(null);
              }}
            >
              Registrar otra llegada
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      ) : mode === "mobile" ? (
        open && <MobileScannerAccess onClose={onClose} />
      ) : (
        <form onSubmit={(event) => void submit(event)} className="flex min-w-0 flex-col gap-4">
          <p className="text-sm text-muted">
            Pega el código de Mis citas o escanea su QR con un lector de teclado.
          </p>
          <Field
            ref={inputRef}
            autoFocus
            label="Código de llegada"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError(undefined);
            }}
            readOnly={busy}
            maxLength={CHECK_IN_CODE_MAX}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            error={error}
            hint="Solo citas programadas para hoy (hora de Colombia)."
            className="w-full min-w-0 text-base"
          />
          {error && (
            <p role="alert" className="sr-only">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={busy}>
              {busy ? "Registrando llegada…" : "Registrar llegada"}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
