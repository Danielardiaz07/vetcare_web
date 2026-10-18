"use client";

import { useId, useState } from "react";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { ownerFullName } from "@/features/owners/labels";
import { APPOINTMENT_TYPE_LABELS } from "@/features/staff/labels";
import { APPOINTMENT_PREP } from "@/lib/appointment-prep";
import { APPOINTMENT_STATUS } from "@/lib/appointment-status";
import { clinicDateOf, dayParts, formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import type { Appointment } from "@/types/domain";

type AppointmentCardProps = {
  appointment: Appointment;
  // Solo las próximas citas muestran "Cómo prepararte".
  withPrep?: boolean;
};

export function AppointmentCard({ appointment, withPrep = false }: AppointmentCardProps) {
  const [prepOpen, setPrepOpen] = useState(false);
  const prepId = useId();
  const { type, status, startsAt, endsAt, patient, professional } = appointment;
  const date = clinicDateOf(new Date(startsAt));
  const parts = dayParts(date);
  const badge = APPOINTMENT_STATUS[status];
  const title = APPOINTMENT_TYPE_LABELS[type];

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
          </div>
          <p className="text-ink first-letter:uppercase">
            {formatLongDate(date)} · {formatClinicTime(startsAt)} a {formatClinicTime(endsAt)}
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
      {withPrep && (
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
              {APPOINTMENT_PREP[type].map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
