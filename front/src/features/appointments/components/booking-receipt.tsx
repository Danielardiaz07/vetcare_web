"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { BookingDetails } from "@/features/appointments/components/booking-details";
import { ownerFullName } from "@/features/owners/labels";
import { APPOINTMENT_TYPE_LABELS, durationLabel } from "@/features/staff/labels";
import { clinicDateOf, formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import { ROUTES } from "@/lib/constants";
import type { Appointment } from "@/types/domain";

const MS_PER_MINUTE = 60 * 1000;

type BookingReceiptProps = {
  appointment: Appointment;
  onBookAnother: () => void;
  // Recepción vuelve a la agenda en lugar de ir a Mis citas.
  onDone?: () => void;
};

export function BookingReceipt({ appointment, onBookAnother, onDone }: BookingReceiptProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { startsAt, endsAt } = appointment;
  const minutes = (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / MS_PER_MINUTE;
  const professionalLabel = appointment.type === "GROOMING" ? "Estilista" : "Veterinario";

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const rows = [
    { label: "Mascota", value: appointment.patient.name },
    { label: "Tipo de cita", value: APPOINTMENT_TYPE_LABELS[appointment.type] },
    { label: professionalLabel, value: ownerFullName(appointment.professional) },
    { label: "Fecha", value: formatLongDate(clinicDateOf(new Date(startsAt))) },
    { label: "Hora", value: `${formatClinicTime(startsAt)} a ${formatClinicTime(endsAt)}` },
    { label: "Duración", value: durationLabel(minutes) },
    ...(appointment.reason ? [{ label: "Motivo", value: appointment.reason }] : []),
  ];

  return (
    <section
      aria-labelledby="booking-receipt-title"
      className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-success-bg text-success">
          <Icon name="calendar" className="size-6" />
        </span>
        <h2
          id="booking-receipt-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-xl font-semibold text-ink outline-none"
        >
          Cita confirmada
        </h2>
      </div>
      <BookingDetails rows={rows} />
      <div className="flex flex-col gap-3 sm:flex-row">
        {onDone ? (
          <Button onClick={onDone}>Volver a la agenda</Button>
        ) : (
          <Link
            href={ROUTES.portalAppointments}
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-600 px-5 font-medium text-white transition-colors duration-150 ease-out hover:bg-brand-700"
          >
            Ver en Mis citas
          </Link>
        )}
        <Button variant="secondary" onClick={onBookAnother}>
          Agendar otra cita
        </Button>
      </div>
    </section>
  );
}
