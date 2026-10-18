"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { durationOf } from "@/features/agenda/components/agenda-item";
import { BookingDetails } from "@/features/appointments/components/booking-details";
import { appointmentErrorMessage, isSlotTaken } from "@/features/appointments/errors";
import { ownerFullName } from "@/features/owners/labels";
import { APPOINTMENT_TYPE_LABELS, durationLabel } from "@/features/staff/labels";
import { APPOINTMENT_STATUS } from "@/lib/appointment-status";
import { clinicDateOf, formatClinicTime, formatLongDate, noShowFrom } from "@/lib/clinic-time";
import { NO_SHOW_GRACE_MINUTES } from "@/lib/constants";
import {
  getReassignOptions,
  markNoShow,
  reassignAppointment,
  registerArrival,
} from "@/services/appointments";
import type { Appointment, Professional } from "@/types/domain";

// Cada medio minuto se revisa si ya se puede marcar "No asistió".
const CLOCK_TICK_MS = 30 * 1000;

type AppointmentDetailProps = {
  appointment: Appointment | null;
  // Registrar llegada, No asistió y Reasignar son de recepción (RF-16).
  canManage: boolean;
  onClose: () => void;
  onChanged: (appointment: Appointment, message: string) => void;
};

export function AppointmentDetail({
  appointment,
  canManage,
  onClose,
  onChanged,
}: AppointmentDetailProps) {
  return (
    <Modal open={appointment !== null} title="Detalle de la cita" onClose={onClose}>
      {appointment && (
        <div className="flex flex-col gap-5">
          <BookingDetails rows={detailRows(appointment)} />
          {canManage && isActive(appointment) && (
            <Actions key={appointment.id} appointment={appointment} onChanged={onChanged} />
          )}
        </div>
      )}
    </Modal>
  );
}

const isActive = ({ status }: Appointment) => status === "SCHEDULED" || status === "CONFIRMED";

const professionalTitle = (appointment: Appointment) =>
  appointment.type === "GROOMING" ? "estilista" : "veterinario";

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

type Mode = "actions" | "no-show" | "reassign";

type ActionsProps = {
  appointment: Appointment;
  onChanged: AppointmentDetailProps["onChanged"];
};

function Actions({ appointment, onChanged }: ActionsProps) {
  const [mode, setMode] = useState<Mode>("actions");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = useNow();
  const noShowAt = noShowFrom(appointment.startsAt);
  const canMarkNoShow = now >= new Date(noShowAt);

  async function run(action: () => Promise<Appointment>, message: string) {
    setBusy(true);
    setError(null);
    try {
      onChanged(await action(), message);
      setMode("actions");
    } catch (failure) {
      setError(appointmentErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  if (mode === "reassign") {
    return (
      <ReassignForm
        appointment={appointment}
        onBack={() => setMode("actions")}
        onChanged={onChanged}
      />
    );
  }

  if (mode === "no-show") {
    return (
      <div className="flex flex-col gap-4 border-t border-line pt-4">
        <p className="text-ink">
          ¿Confirmas que <strong>{appointment.patient.name}</strong> no asistió? La cita quedará
          como No asistió y no se puede deshacer.
        </p>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setMode("actions")} disabled={busy}>
            Volver
          </Button>
          <Button
            variant="danger"
            loading={busy}
            onClick={() => run(() => markNoShow(appointment.id), "La cita quedó como No asistió")}
          >
            Sí, no asistió
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {appointment.status === "SCHEDULED" && (
          <Button
            loading={busy}
            onClick={() => run(() => registerArrival(appointment.id), "Llegada registrada")}
          >
            Registrar llegada
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={!canMarkNoShow || busy}
          aria-describedby={canMarkNoShow ? undefined : "no-show-hint"}
          onClick={() => {
            setError(null);
            setMode("no-show");
          }}
        >
          No asistió
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => setMode("reassign")}>
          Reasignar profesional
        </Button>
      </div>
      {!canMarkNoShow && (
        <p id="no-show-hint" className="text-sm text-muted">
          “No asistió” se habilita a las {formatClinicTime(noShowAt)}, {NO_SHOW_GRACE_MINUTES}{" "}
          minutos después de la hora de la cita.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

type ReassignFormProps = ActionsProps & { onBack: () => void };

// RN-32: solo se ofrecen profesionales del mismo tipo con esa hora libre.
function ReassignForm({ appointment, onBack, onChanged }: ReassignFormProps) {
  const [options, setOptions] = useState<Load<Professional[]>>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = professionalTitle(appointment);

  useEffect(() => {
    let active = true;
    setOptions({ status: "loading" });
    getReassignOptions(appointment)
      .then((data) => {
        if (!active) return;
        setOptions({ status: "ready", data });
        setChoice((current) => (data.some((item) => item.id === current) ? current : ""));
      })
      .catch(() => {
        if (active) setOptions({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [appointment, reloadKey]);

  async function save() {
    if (!choice) {
      setError(`Elige el ${title} que tomará la cita.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await reassignAppointment(appointment.id, choice);
      onChanged(updated, `La cita pasó a la agenda de ${ownerFullName(updated.professional)}`);
      onBack();
    } catch (failure) {
      if (isSlotTaken(failure)) {
        setError(`Ese ${title} ya no está libre a esa hora. Elige otro.`);
        setReloadKey((key) => key + 1);
      } else {
        setError(appointmentErrorMessage(failure));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4">
      <h3 className="font-semibold text-ink">Reasignar profesional</h3>
      {options.status === "loading" && <LoadingState rows={1} />}
      {options.status === "error" && <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />}
      {options.status === "ready" && options.data.length === 0 && (
        <p className="text-muted">No hay otro {title} libre a esa hora.</p>
      )}
      {options.status === "ready" && options.data.length > 0 && (
        <Select
          label={`Nuevo ${title}`}
          value={choice}
          onChange={(event) => {
            setError(null);
            setChoice(event.target.value);
          }}
        >
          <option value="" disabled>
            Elige el {title}
          </option>
          {options.data.map((item) => (
            <option key={item.id} value={item.id}>
              {ownerFullName(item)}
            </option>
          ))}
        </Select>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onBack} disabled={busy}>
          Volver
        </Button>
        {options.status === "ready" && options.data.length > 0 && (
          <Button loading={busy} onClick={save}>
            Guardar
          </Button>
        )}
      </div>
    </div>
  );
}

function detailRows(appointment: Appointment) {
  const { startsAt, endsAt, owner, reason, cancelReason } = appointment;
  return [
    { label: "Mascota", value: appointment.patient.name },
    ...(owner
      ? [
          { label: "Propietario", value: ownerFullName(owner) },
          { label: "Celular", value: owner.phone },
        ]
      : []),
    { label: "Tipo de cita", value: APPOINTMENT_TYPE_LABELS[appointment.type] },
    { label: "Profesional", value: ownerFullName(appointment.professional) },
    { label: "Estado", value: APPOINTMENT_STATUS[appointment.status].label },
    { label: "Fecha", value: formatLongDate(clinicDateOf(new Date(startsAt))) },
    { label: "Hora", value: `${formatClinicTime(startsAt)} a ${formatClinicTime(endsAt)}` },
    { label: "Duración", value: durationLabel(durationOf(appointment)) },
    ...(reason ? [{ label: "Motivo", value: reason }] : []),
    ...(cancelReason ? [{ label: "Motivo de la cancelación", value: cancelReason }] : []),
  ];
}
