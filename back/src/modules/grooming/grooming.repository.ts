import { AppointmentStatus, Prisma, type AppointmentType, type GroomingType } from "@prisma/client";
import { ConflictError } from "@/shared/errors";
import { prisma } from "@/shared/prisma";

const UNIQUE_VIOLATION = "P2002";

const groomingInclude = {
  groomer: { select: { id: true, firstNames: true, lastNames: true } },
} as const;

export type GroomingRecord = Prisma.GroomingServiceGetPayload<{ include: typeof groomingInclude }>;

export interface AppointmentForGrooming {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  patientId: string;
  groomerId: string | null;
}

export interface NewGroomingData {
  patientId: string;
  groomerId: string;
  appointmentId?: string;
  type: GroomingType;
  observations?: string;
  cost: number;
}

export class GroomingRepository {
  findAppointment(id: string): Promise<AppointmentForGrooming | null> {
    return prisma.appointment.findUnique({
      where: { id },
      select: { id: true, type: true, status: true, patientId: true, groomerId: true },
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

  async findGroomerIdByUserId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { groomerId: true },
    });
    return user?.groomerId ?? null;
  }

  // Con cita, el servicio y el paso de la cita a ATENDIDA van en una sola transacción (RN-46).
  async create(data: NewGroomingData): Promise<GroomingRecord> {
    const { appointmentId } = data;
    if (!appointmentId) return prisma.groomingService.create({ data, include: groomingInclude });

    try {
      return await prisma.$transaction(async (tx) => {
        const closed = await tx.appointment.updateMany({
          where: { id: appointmentId, status: AppointmentStatus.CONFIRMED },
          data: { status: AppointmentStatus.ATTENDED },
        });
        if (closed.count === 0) {
          throw new ConflictError("Solo se registra un servicio sobre una cita confirmada");
        }
        return tx.groomingService.create({ data, include: groomingInclude });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        throw new ConflictError("La cita ya tiene un servicio de estetica registrado");
      }
      throw error;
    }
  }

  listByPatient(patientId: string): Promise<GroomingRecord[]> {
    return prisma.groomingService.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
      include: groomingInclude,
    });
  }
}
