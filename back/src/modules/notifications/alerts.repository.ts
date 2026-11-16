import { AppointmentStatus, InvoiceStatus, type AppointmentType } from "@prisma/client";
import { prisma } from "@/shared/prisma";

export interface UpcomingAppointmentRecord {
  id: string;
  type: AppointmentType;
  startsAt: Date;
  patient: { id: string; name: string };
}

export interface VaccineDoseRecord {
  id: string;
  nextDoseAt: Date | null;
  patient: { id: string; name: string };
  vaccine: { name: string };
}

export interface ConsultationWeightRecord {
  id: string;
  weightKg: { toNumber(): number };
  createdAt: Date;
  patient: { id: string; name: string };
}

export interface RecentInvoiceRecord {
  id: string;
  number: number;
  createdAt: Date;
}

const ACTIVE_STATUSES = [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED];

export class AlertsRepository {
  async findOwnerIdByUserId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { ownerId: true } });
    return user?.ownerId ?? null;
  }

  upcomingAppointments(
    ownerId: string,
    from: Date,
    to: Date,
  ): Promise<UpcomingAppointmentRecord[]> {
    return prisma.appointment.findMany({
      where: {
        patient: { ownerId },
        status: { in: ACTIVE_STATUSES },
        startsAt: { gte: from, lt: to },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        type: true,
        startsAt: true,
        patient: { select: { id: true, name: true } },
      },
    });
  }

  // Última dosis de cada vacuna de cada mascota activa del propietario (RN-49).
  latestVaccineDoses(ownerId: string): Promise<VaccineDoseRecord[]> {
    return prisma.vaccination.findMany({
      where: { patient: { ownerId, active: true } },
      distinct: ["patientId", "vaccineId"],
      orderBy: [
        { patientId: "asc" },
        { vaccineId: "asc" },
        { appliedAt: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        nextDoseAt: true,
        patient: { select: { id: true, name: true } },
        vaccine: { select: { name: true } },
      },
    });
  }

  // Consultas de las mascotas activas, de la más reciente a la más antigua dentro de cada mascota (RN-81).
  consultationWeights(ownerId: string): Promise<ConsultationWeightRecord[]> {
    return prisma.consultation.findMany({
      where: { patient: { ownerId, active: true } },
      orderBy: [{ patientId: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        weightKg: true,
        createdAt: true,
        patient: { select: { id: true, name: true } },
      },
    });
  }

  recentInvoices(ownerId: string, since: Date): Promise<RecentInvoiceRecord[]> {
    return prisma.invoice.findMany({
      where: { ownerId, status: InvoiceStatus.PAID, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      select: { id: true, number: true, createdAt: true },
    });
  }
}
