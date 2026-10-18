import { Modal } from "@/components/ui/modal";
import { BookingDetails } from "@/features/appointments/components/booking-details";
import { durationOf } from "@/features/agenda/components/agenda-item";
import { ownerFullName } from "@/features/owners/labels";
import { APPOINTMENT_TYPE_LABELS, durationLabel } from "@/features/staff/labels";
import { APPOINTMENT_STATUS } from "@/lib/appointment-status";
import { clinicDateOf, formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import type { Appointment } from "@/types/domain";

type AppointmentDetailProps = {
  appointment: Appointment | null;
  onClose: () => void;
};

export function AppointmentDetail({ appointment, onClose }: AppointmentDetailProps) {
  return (
    <Modal open={appointment !== null} title="Detalle de la cita" onClose={onClose}>
      {appointment && <BookingDetails rows={detailRows(appointment)} />}
    </Modal>
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
