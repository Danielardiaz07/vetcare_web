import { AppointmentStatus, Prisma } from "@prisma/client";
import { ConflictError } from "@/shared/errors";
import { prisma } from "@/shared/prisma";

const UNIQUE_VIOLATION = "P2002";

const professionalSelect = { id: true, firstNames: true, lastNames: true } as const;

const consultationInclude = { veterinarian: { select: professionalSelect } } as const;
const vaccinationInclude = {
  vaccine: { select: { id: true, name: true } },
  veterinarian: { select: professionalSelect },
} as const;

export type ConsultationRecord = Prisma.ConsultationGetPayload<{
  include: typeof consultationInclude;
}>;
export type VaccinationRecord = Prisma.VaccinationGetPayload<{
  include: typeof vaccinationInclude;
}>;

export interface AppointmentForConsultation {
  id: string;
  status: AppointmentStatus;
  patientId: string;
  veterinarianId: string | null;
}

export interface NewConsultationData {
  appointmentId: string;
  patientId: string;
  veterinarianId: string;
  symptoms: string;
  weightKg: number;
  temperatureC: number;
  diagnosis: string;
  treatment: string;
  prescription?: string;
  internalNotes?: string;
  cost: number;
}

export interface NewVaccinationData {
  patientId: string;
  veterinarianId: string;
  vaccineId: string;
  lot: string;
  appliedAt: Date;
  nextDoseAt?: Date;
  price: Prisma.Decimal;
}

export interface HistoryFilters {
  from?: Date;
  to?: Date; // exclusivo
}

const rangeOf = (field: "createdAt" | "appliedAt", { from, to }: HistoryFilters) =>
  from || to ? { [field]: { ...(from && { gte: from }), ...(to && { lt: to }) } } : {};

export class ClinicalRepository {
  findAppointment(id: string): Promise<AppointmentForConsultation | null> {
    return prisma.appointment.findUnique({
      where: { id },
      select: { id: true, status: true, patientId: true, veterinarianId: true },
    });
  }

  findPatient(id: string): Promise<{ id: string; ownerId: string; active: boolean } | null> {
    return prisma.patient.findUnique({
      where: { id },
      select: { id: true, ownerId: true, active: true },
    });
  }

  async findOwnerIdByUserId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { ownerId: true } });
    return user?.ownerId ?? null;
  }

  async findVeterinarianIdByUserId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { veterinarianId: true },
    });
    return user?.veterinarianId ?? null;
  }

  // RN-46: la consulta, el cambio de estado de la cita y el peso del paciente van en una sola transacción.
  async createConsultation(data: NewConsultationData): Promise<ConsultationRecord> {
    try {
      return await prisma.$transaction(async (tx) => {
        const consultation = await tx.consultation.create({
          data,
          include: consultationInclude,
        });
        await tx.appointment.update({
          where: { id: data.appointmentId },
          data: { status: AppointmentStatus.ATTENDED },
        });
        await tx.patient.update({
          where: { id: data.patientId },
          data: { weightKg: data.weightKg },
        });
        return consultation;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictError("La cita ya tiene una consulta registrada");
      }
      throw error;
    }
  }

  listConsultations(patientId: string, filters: HistoryFilters): Promise<ConsultationRecord[]> {
    return prisma.consultation.findMany({
      where: { patientId, ...rangeOf("createdAt", filters) },
      orderBy: { createdAt: "desc" },
      include: consultationInclude,
    });
  }

  findVaccine(id: string) {
    return prisma.vaccine.findUnique({ where: { id } });
  }

  listVaccines() {
    return prisma.vaccine.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  }

  async createVaccine(data: { name: string; price: number }) {
    try {
      return await prisma.vaccine.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictError("Ya existe una vacuna con ese nombre");
      }
      throw error;
    }
  }

  createVaccination(data: NewVaccinationData): Promise<VaccinationRecord> {
    return prisma.vaccination.create({ data, include: vaccinationInclude });
  }

  listVaccinations(patientId: string, filters: HistoryFilters): Promise<VaccinationRecord[]> {
    return prisma.vaccination.findMany({
      where: { patientId, ...rangeOf("appliedAt", filters) },
      orderBy: [{ appliedAt: "desc" }, { createdAt: "desc" }],
      include: vaccinationInclude,
    });
  }
}
