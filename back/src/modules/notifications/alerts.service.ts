import type { AppointmentType } from "@prisma/client";
import {
  ALERT_APPOINTMENT_HOURS,
  ALERT_INVOICE_DAYS,
  CLINIC_TIME_ZONE,
  VACCINE_DUE_SOON_DAYS,
} from "@/config/constants";
import type { AlertResponseDto, AlertsResponseDto } from "@/modules/notifications/dto/alerts.dto";
import type { AlertsRepository } from "@/modules/notifications/alerts.repository";
import { ForbiddenError } from "@/shared/errors";
import {
  addDays,
  addMinutes,
  clinicDateOf,
  daysBetween,
} from "@/shared/utils/clinic-time";

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const ISO_DATE_LENGTH = 10;

const TYPE_LABEL: Record<AppointmentType, string> = {
  GENERAL_CONSULTATION: "consulta general",
  VACCINATION: "vacunacion",
  CHECKUP: "control",
  GROOMING: "estetica",
};

const timeOfDay = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: CLINIC_TIME_ZONE,
});

const plural = (count: number, singular: string, pluralForm: string) =>
  count === 1 ? singular : pluralForm;

// Centro de avisos del propietario: se calcula al consultar con lo que ya existe (citas, carné y facturas),
// sin tabla propia. Los correos de D-38 siguen saliendo por su cola.
export class AlertsService {
  constructor(
    private readonly repository: AlertsRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async listMine(userId: string): Promise<AlertsResponseDto> {
    const ownerId = await this.repository.findOwnerIdByUserId(userId);
    if (!ownerId) throw new ForbiddenError();

    const now = this.clock();
    const [appointments, doses, invoices] = await Promise.all([
      this.repository.upcomingAppointments(
        ownerId,
        now,
        addMinutes(now, ALERT_APPOINTMENT_HOURS * MINUTES_PER_HOUR),
      ),
      this.repository.latestVaccineDoses(ownerId),
      this.repository.recentInvoices(
        ownerId,
        addMinutes(now, -ALERT_INVOICE_DAYS * MINUTES_PER_DAY),
      ),
    ]);

    const data = [
      ...this.appointmentAlerts(appointments, now),
      ...this.vaccineAlerts(doses, now),
      ...invoices.map(
        (invoice): AlertResponseDto => ({
          id: `invoice:${invoice.id}`,
          kind: "INVOICE_NEW",
          message: `Tienes una factura nueva: FAC-${String(invoice.number).padStart(6, "0")}`,
          date: invoice.createdAt.toISOString(),
          invoiceId: invoice.id,
        }),
      ),
    ];
    return { total: data.length, data };
  }

  private appointmentAlerts(
    appointments: Awaited<ReturnType<AlertsRepository["upcomingAppointments"]>>,
    now: Date,
  ): AlertResponseDto[] {
    const today = clinicDateOf(now);
    return appointments.map((appointment) => {
      const day = clinicDateOf(appointment.startsAt) === today ? "hoy" : "manana";
      return {
        id: `appointment:${appointment.id}`,
        kind: "APPOINTMENT_UPCOMING",
        message: `La cita de ${appointment.patient.name} (${TYPE_LABEL[appointment.type]}) es ${day} a las ${timeOfDay.format(appointment.startsAt)}`,
        date: appointment.startsAt.toISOString(),
        patientId: appointment.patient.id,
        appointmentId: appointment.id,
      };
    });
  }

  // Vencida o dentro de VACCINE_DUE_SOON_DAYS, con los mismos umbrales del carné (RN-49).
  private vaccineAlerts(
    doses: Awaited<ReturnType<AlertsRepository["latestVaccineDoses"]>>,
    now: Date,
  ): AlertResponseDto[] {
    const today = clinicDateOf(now);
    const limit = addDays(today, VACCINE_DUE_SOON_DAYS);
    const alerts: AlertResponseDto[] = [];

    for (const dose of doses) {
      if (!dose.nextDoseAt) continue;
      const date = dose.nextDoseAt.toISOString().slice(0, ISO_DATE_LENGTH);
      if (date > limit) continue;

      const days = daysBetween(today, date);
      const overdue = days < 0;
      const name = dose.patient.name;
      const vaccine = dose.vaccine.name;
      const when = overdue
        ? `esta vencida desde hace ${-days} ${plural(-days, "dia", "dias")}`
        : days === 0
          ? "vence hoy"
          : `vence en ${days} ${plural(days, "dia", "dias")}`;

      alerts.push({
        id: `vaccination:${dose.id}`,
        kind: overdue ? "VACCINE_OVERDUE" : "VACCINE_DUE",
        message: `La vacuna ${vaccine} de ${name} ${when}`,
        date,
        patientId: dose.patient.id,
      });
    }
    return alerts.sort((a, b) => a.date.localeCompare(b.date));
  }
}
