"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { CancelDialog } from "@/features/appointments/components/cancel-dialog";
import { CheckInQr } from "@/features/appointments/components/check-in-qr";
import { RescheduleForm } from "@/features/appointments/components/reschedule-form";
import { CONTACT_CLINIC_MESSAGE } from "@/features/appointments/errors";
import { ownerFullName } from "@/features/owners/labels";
import { APPOINTMENT_TYPE_LABELS } from "@/features/staff/labels";
import { APPOINTMENT_PREP } from "@/lib/appointment-prep";
import { appointmentLabStatus, isProcedureAppointment } from "@/lib/appointment-procedures";
import { APPOINTMENT_STATUS } from "@/lib/appointment-status";
import {
  clinicDateOf,
  dayParts,
  formatClinicTime,
  formatLongDate,
  isChangeable,
} from "@/lib/clinic-time";
import type { Appointment } from "@/types/domain";

type AppointmentCardProps = {
  appointment: Appointment;
  withPrep?: boolean;
  onChanged?: (message: string) => void;
};

export function AppointmentCard({
  appointment,
  withPrep = false,
  onChanged,
}: AppointmentCardProps) {
  const [prepOpen, setPrepOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const prepId = useId();
  const { type, status, startsAt, endsAt, patient, professional } = appointment;
  const date = clinicDateOf(new Date(startsAt));
  const parts = dayParts(date);
  const badge = APPOINTMENT_STATUS[status];
  const title = APPOINTMENT_TYPE_LABELS[type];
  const active = status === "SCHEDULED" || status === "CONFIRMED";
  const isProcedure = isProcedureAppointment(type);
  const changeable = !isProcedure && isChangeable(startsAt);
  const labStatus = appointmentLabStatus(appointment);
  const prep = withPrep && !isProcedure ? APPOINTMENT_PREP[type] : null;
  const timeRange = `${formatClinicTime(startsAt)} a ${formatClinicTime(endsAt)}`;

  return (
    <article
      aria-label={`${title}, ${formatLongDate(date)}`}
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
    >
      <div className="flex gap-4">
        <div
          aria-hidden="true"
          className="flex size-16 shrink-0 flex-col items-center justify-center rounded-control bg-brand-50 text-brand-700"
        >
          <span className="text-sm uppercase">{parts.month}</span>
          <span className="text-2xl leading-none font-semibold">{parts.day}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-ink">{title}</h3>
            <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
            {labStatus && <StatusBadge tone={labStatus.tone}>{labStatus.label}</StatusBadge>}
          </div>
          {appointment.procedureName && (
            <p className="font-medium break-words text-ink">{appointment.procedureName}</p>
          )}
          <p className="text-ink first-letter:uppercase">
            {formatLongDate(date)} · {timeRange}
          </p>
          <p className="text-muted">
            {patient.name} · {ownerFullName(professional)}
          </p>
          {status === "CANCELLED" && appointment.cancelReason && (
            <p className="text-sm text-muted">
              Motivo de la cancelación: {appointment.cancelReason}
            </p>
          )}
        </div>
      </div>
      {appointment.instructions && (
        <div className="flex flex-col gap-1 border-t border-divider pt-3">
          <p className="font-semibold text-ink">Indicaciones de la clínica</p>
          <p className="whitespace-pre-line break-words text-ink">{appointment.instructions}</p>
        </div>
      )}
      {onChanged && active && !rescheduling && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-3">
            {status === "SCHEDULED" && date >= clinicDateOf(new Date()) && (
              <CheckInQr key={startsAt} appointment={appointment} />
            )}
            {!isProcedure && (
              <>
                <Button
                  variant="secondary"
                  disabled={!changeable}
                  onClick={() => setRescheduling(true)}
                >
                  Reprogramar
                </Button>
                <Button
                  variant="secondary"
                  disabled={!changeable}
                  onClick={() => setCancelling(true)}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
          {!changeable && <p className="text-sm text-muted">{CONTACT_CLINIC_MESSAGE}</p>}
        </div>
      )}
      {onChanged && !isProcedure && rescheduling && (
        <RescheduleForm
          appointment={appointment}
          onCancel={() => setRescheduling(false)}
          onRescheduled={() => {
            setRescheduling(false);
            onChanged("Cita reprogramada");
          }}
        />
      )}
      {onChanged && !isProcedure && (
        <CancelDialog
          appointment={appointment}
          details={[
            { label: "Mascota", value: patient.name },
            { label: "Tipo de cita", value: title },
            { label: "Profesional", value: ownerFullName(professional) },
            { label: "Fecha", value: formatLongDate(date) },
            { label: "Hora", value: timeRange },
          ]}
          open={cancelling}
          onClose={() => setCancelling(false)}
          onCancelled={() => {
            setCancelling(false);
            onChanged("Cita cancelada");
          }}
        />
      )}
      {prep && (
        <div className="flex flex-col gap-2 border-t border-divider pt-3">
          <button
            type="button"
            aria-expanded={prepOpen}
            aria-controls={prepId}
            onClick={() => setPrepOpen((open) => !open)}
            className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-brand-700"
          >
            Cómo prepararte
            <Icon
              name="chevron-right"
              className={cn(
                "size-4 transition-transform duration-150 ease-out",
                prepOpen ? "-rotate-90" : "rotate-90",
              )}
            />
          </button>
          {prepOpen && (
            <ul id={prepId} className="flex list-disc flex-col gap-1 pl-5 text-ink">
              {prep.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
