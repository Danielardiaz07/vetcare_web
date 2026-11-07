import { AppointmentStatus, InvoiceStatus } from "@prisma/client";
import { prisma } from "@/shared/prisma";

export interface Period {
  from: Date;
  to: Date; // exclusivo
}

const within = ({ from, to }: Period) => ({ gte: from, lt: to });
const paidIn = (period: Period) => ({
  status: InvoiceStatus.PAID,
  createdAt: within(period),
});

export class ReportsRepository {
  appointmentsByStatus(period: Period) {
    return prisma.appointment.groupBy({
      by: ["status"],
      where: { startsAt: within(period) },
      _count: { _all: true },
    });
  }

  appointmentsByType(period: Period) {
    return prisma.appointment.groupBy({
      by: ["type"],
      where: { startsAt: within(period), status: { not: AppointmentStatus.CANCELLED } },
      _count: { _all: true },
    });
  }

  paidInvoiceTotals(period: Period) {
    return prisma.invoice.aggregate({
      where: paidIn(period),
      _count: { _all: true },
      _sum: { subtotal: true, tax: true, total: true },
    });
  }

  paidInvoicesByMethod(period: Period) {
    return prisma.invoice.groupBy({
      by: ["paymentMethod"],
      where: paidIn(period),
      _count: { _all: true },
      _sum: { total: true },
    });
  }

  // El agrupado por día se hace en la aplicación: el día es el de la clínica (UTC−5), no el de la base.
  paidInvoiceDates(period: Period) {
    return prisma.invoice.findMany({
      where: paidIn(period),
      select: { createdAt: true, total: true },
      orderBy: { createdAt: "asc" },
    });
  }

  countPatients(period: Period): Promise<number> {
    return prisma.patient.count({ where: { createdAt: within(period) } });
  }

  countOwners(period: Period): Promise<number> {
    return prisma.owner.count({ where: { createdAt: within(period) } });
  }

  countOpenHospitalizations(): Promise<number> {
    return prisma.hospitalization.count({ where: { dischargedAt: null } });
  }

  // Última dosis de cada vacuna de cada mascota activa (RN-49).
  async latestNextDoses(): Promise<(Date | null)[]> {
    const doses = await prisma.vaccination.findMany({
      where: { patient: { active: true } },
      distinct: ["patientId", "vaccineId"],
      orderBy: [
        { patientId: "asc" },
        { vaccineId: "asc" },
        { appliedAt: "desc" },
        { createdAt: "desc" },
      ],
      select: { nextDoseAt: true },
    });
    return doses.map((dose) => dose.nextDoseAt);
  }
}
