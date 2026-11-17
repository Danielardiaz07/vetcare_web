import { clinicDateOf, formatClinicTime } from "@/lib/clinic-time";
import { formatDate } from "@/lib/format";
import { getAllMyAppointments } from "@/services/appointments";
import { getMyVaccinationCard, getWeightTrend } from "@/services/clinical";
import { request } from "@/services/http-client";
import { listMyInvoices } from "@/services/invoices";
import { isMockEnabled, isNewAccount, mockResponse } from "@/services/mocks";
import { getMyPatients } from "@/services/patients";
import type { PortalAlert, PortalAlerts } from "@/types/alerts";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const UPCOMING_DAYS = 2;
const RECENT_INVOICE_DAYS = 7;
const RECENT_WEIGHT_DAYS = 30;
const percentFormatter = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

async function mockMyAlerts(): Promise<PortalAlerts> {
  if (isNewAccount) return mockResponse({ total: 0, data: [] });
  const now = Date.now();
  const [pets, appointments, firstInvoices] = await Promise.all([
    getMyPatients(),
    getAllMyAppointments("upcoming"),
    listMyInvoices(1),
  ]);
  const remainingInvoices = await Promise.all(
    Array.from({ length: Math.max(0, firstInvoices.meta.totalPages - 1) }, (_, index) =>
      listMyInvoices(index + 2),
    ),
  );
  const data: PortalAlert[] = appointments
    .filter((appointment) => {
      const startsAt = new Date(appointment.startsAt).getTime();
      return (
        (appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED") &&
        startsAt >= now &&
        startsAt <= now + UPCOMING_DAYS * MS_PER_DAY
      );
    })
    .map((appointment) => ({
      id: `appointment:${appointment.id}`,
      kind: "APPOINTMENT_UPCOMING",
      message: `La cita de ${appointment.patient.name} es el ${formatDate(clinicDateOf(new Date(appointment.startsAt)))} a las ${formatClinicTime(appointment.startsAt)}.`,
      date: appointment.startsAt,
      patientId: appointment.patient.id,
      appointmentId: appointment.id,
    }));

  const clinicalAlerts = await Promise.all(
    pets.map(async (pet): Promise<PortalAlert[]> => {
      const [card, trend] = await Promise.all([
        getMyVaccinationCard(pet.id),
        getWeightTrend(pet.id),
      ]);
      const alerts: PortalAlert[] = card
        .filter((dose) => dose.nextDoseAt && dose.status !== "UP_TO_DATE")
        .map((dose) => ({
          id: `vaccination:${dose.id}`,
          kind: dose.status === "OVERDUE" ? "VACCINE_OVERDUE" : "VACCINE_DUE",
          message: `La vacuna ${dose.vaccine.name} de ${pet.name} ${dose.status === "OVERDUE" ? "venció" : "vence"} el ${formatDate(dose.nextDoseAt!)}.`,
          date: dose.nextDoseAt!,
          patientId: pet.id,
        }));
      const last = trend.points.at(-1);
      if (
        last &&
        trend.change?.flagged &&
        new Date(last.date).getTime() >= now - RECENT_WEIGHT_DAYS * MS_PER_DAY
      ) {
        alerts.push({
          id: `weight:${last.consultationId}`,
          kind: "WEIGHT_CHANGE",
          message: `El peso de ${pet.name} ${trend.change.percent > 0 ? "subió" : "bajó"} ${percentFormatter.format(Math.abs(trend.change.percent))} % desde la consulta anterior (${trend.change.previousKg} a ${trend.change.currentKg} kg).`,
          date: last.date,
          patientId: pet.id,
        });
      }
      return alerts;
    }),
  );
  data.push(...clinicalAlerts.flat());
  const invoices = [firstInvoices, ...remainingInvoices].flatMap((page) => page.data);
  data.push(
    ...invoices
      .filter(
        (invoice) =>
          invoice.status === "PAID" &&
          new Date(invoice.createdAt).getTime() >= now - RECENT_INVOICE_DAYS * MS_PER_DAY,
      )
      .map((invoice): PortalAlert => ({
        id: `invoice:${invoice.id}`,
        kind: "INVOICE_NEW",
        message: `Tienes una factura nueva: ${invoice.number}.`,
        date: invoice.createdAt,
        invoiceId: invoice.id,
      })),
  );
  return mockResponse({ total: data.length, data });
}

export function getMyAlerts(): Promise<PortalAlerts> {
  if (isMockEnabled) return mockMyAlerts();
  return request<PortalAlerts>("/me/alerts");
}
