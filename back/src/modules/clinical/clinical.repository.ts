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
export type SurgeryRecord = Prisma.SurgeryGetPayload<{ include: typeof consultationInclude }>;
export type HospitalizationRecord = Prisma.HospitalizationGetPayload<{
  include: typeof consultationInclude;
}>;
export type LabExamRecord = Prisma.LabExamGetPayload<{ include: typeof consultationInclude }>;

export interface NewSurgeryData {
  patientId: string;
  veterinarianId: string;
  procedure: string;
  performedAt: Date;
  notes?: string;
}

export interface NewHospitalizationData {
  patientId: string;
  veterinarianId: string;
  reason: string;
  admittedAt: Date;
}

export interface NewLabExamData {
  patientId: string;
  veterinarianId: string;
  examType: string;
  performedAt: Date;
  results: string;
}

export interface HospitalizationListFilters {
  status?: "ADMITTED" | "DISCHARGED";
  patientId?: string;
  skip: number;
  take: number;
}

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

const rangeOf = (
  field: "createdAt" | "appliedAt" | "performedAt" | "admittedAt",
  { from, to }: HistoryFilters,
) => (from || to ? { [field]: { ...(from && { gte: from }), ...(to && { lt: to }) } } : {});

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

  // Con cita, la vacunación y el paso de la cita a ATENDIDA van en una sola transacción (RN-46).
  createVaccination(data: NewVaccinationData, appointmentId?: string): Promise<VaccinationRecord> {
    if (!appointmentId) return prisma.vaccination.create({ data, include: vaccinationInclude });

    return prisma.$transaction(async (tx) => {
      const closed = await tx.appointment.updateMany({
        where: { id: appointmentId, status: AppointmentStatus.CONFIRMED },
        data: { status: AppointmentStatus.ATTENDED },
      });
      if (closed.count === 0) {
        throw new ConflictError("Solo se registra una vacunacion sobre una cita confirmada");
      }
      return tx.vaccination.create({ data, include: vaccinationInclude });
    });
  }

  createSurgery(data: NewSurgeryData): Promise<SurgeryRecord> {
    return prisma.surgery.create({ data, include: consultationInclude });
  }

  createLabExam(data: NewLabExamData): Promise<LabExamRecord> {
    return prisma.labExam.create({ data, include: consultationInclude });
  }

  // RN-50: el índice único parcial de la migración impide dos internaciones abiertas de la misma mascota.
  async createHospitalization(data: NewHospitalizationData): Promise<HospitalizationRecord> {
    try {
      return await prisma.hospitalization.create({ data, include: consultationInclude });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictError("La mascota ya tiene una internacion abierta");
      }
      throw error;
    }
  }

  findHospitalization(id: string): Promise<HospitalizationRecord | null> {
    return prisma.hospitalization.findUnique({ where: { id }, include: consultationInclude });
  }

  // Solo cierra una internación abierta: si otra petición ya dio el egreso, no hay nada que actualizar.
  async dischargeHospitalization(
    id: string,
    dischargedAt: Date,
    dischargeNotes?: string,
  ): Promise<HospitalizationRecord> {
    const closed = await prisma.hospitalization.updateMany({
      where: { id, dischargedAt: null },
      data: { dischargedAt, dischargeNotes },
    });
    if (closed.count === 0) throw new ConflictError("La internacion ya tiene egreso");
    return prisma.hospitalization.findUniqueOrThrow({
      where: { id },
      include: consultationInclude,
    });
  }

  async listHospitalizations(
    filters: HospitalizationListFilters,
  ): Promise<{ items: HospitalizationRecord[]; total: number }> {
    const where: Prisma.HospitalizationWhereInput = {
      ...(filters.patientId && { patientId: filters.patientId }),
      ...(filters.status && { dischargedAt: filters.status === "ADMITTED" ? null : { not: null } }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.hospitalization.findMany({
        where,
        orderBy: { admittedAt: "desc" },
        skip: filters.skip,
        take: filters.take,
        include: consultationInclude,
      }),
      prisma.hospitalization.count({ where }),
    ]);
    return { items, total };
  }

  listSurgeries(patientId: string, filters: HistoryFilters): Promise<SurgeryRecord[]> {
    return prisma.surgery.findMany({
      where: { patientId, ...rangeOf("performedAt", filters) },
      orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
      include: consultationInclude,
    });
  }

  listPatientHospitalizations(
    patientId: string,
    filters: HistoryFilters,
  ): Promise<HospitalizationRecord[]> {
    return prisma.hospitalization.findMany({
      where: { patientId, ...rangeOf("admittedAt", filters) },
      orderBy: { admittedAt: "desc" },
      include: consultationInclude,
    });
  }

  listLabExams(patientId: string, filters: HistoryFilters): Promise<LabExamRecord[]> {
    return prisma.labExam.findMany({
      where: { patientId, ...rangeOf("performedAt", filters) },
      orderBy: [{ performedAt: "desc" }, { createdAt: "desc" }],
      include: consultationInclude,
    });
  }

  listVaccinations(patientId: string, filters: HistoryFilters): Promise<VaccinationRecord[]> {
    return prisma.vaccination.findMany({
      where: { patientId, ...rangeOf("appliedAt", filters) },
      orderBy: [{ appliedAt: "desc" }, { createdAt: "desc" }],
      include: vaccinationInclude,
    });
  }
}
