import { AppointmentStatus, type AppointmentType, type Prisma } from "@prisma/client";
import { prisma } from "@/shared/prisma";

export type ProfessionalKind = "VETERINARIAN" | "GROOMER";

// Estados que ocupan la franja (los mismos que filtran las exclusiones de la migración).
export const OCCUPYING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.ATTENDED,
];
// Estados que aún se pueden cambiar (RN-28, RN-34).
export const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
];

const CONSTRAINT_TARGETS: Record<string, SlotTarget> = {
  Appointment_veterinarian_no_overlap: "PROFESSIONAL",
  Appointment_groomer_no_overlap: "PROFESSIONAL",
  Appointment_patient_no_overlap: "PATIENT",
};

export type SlotTarget = "PROFESSIONAL" | "PATIENT";

// RN-27: la base rechazó la franja porque otra cita la ocupó primero.
export class SlotTakenError extends Error {
  constructor(readonly target: SlotTarget) {
    super("Franja ocupada");
  }
}

function slotTargetOf(error: unknown): SlotTarget | null {
  const message = error instanceof Error ? error.message : "";
  const name = Object.keys(CONSTRAINT_TARGETS).find((constraint) => message.includes(constraint));
  return name ? (CONSTRAINT_TARGETS[name] ?? null) : null;
}

const professionalSelect = { id: true, firstNames: true, lastNames: true } as const;

const appointmentInclude = {
  patient: {
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: { select: { id: true, firstNames: true, lastNames: true, phone: true } },
    },
  },
  veterinarian: { select: professionalSelect },
  groomer: { select: professionalSelect },
} satisfies Prisma.AppointmentInclude;

export type AppointmentRecord = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

export interface ScheduleBlockRecord {
  weekday: number;
  startTime: Date;
  endTime: Date;
}

export interface ProfessionalRecord {
  id: string;
  firstNames: string;
  lastNames: string;
  schedules: ScheduleBlockRecord[];
}

export interface BusyRecord {
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
}

export interface PatientStateRecord {
  id: string;
  ownerId: string;
  active: boolean;
}

export interface NewAppointmentData {
  patientId: string;
  type: AppointmentType;
  kind: ProfessionalKind;
  professionalId: string;
  startsAt: Date;
  endsAt: Date;
  reason?: string;
}

export interface AppointmentChanges {
  startsAt?: Date;
  endsAt?: Date;
  professionalId?: string;
  status?: AppointmentStatus;
  cancelReason?: string;
}

export interface AgendaFilters {
  from: Date;
  to: Date;
  veterinarianId?: string;
  groomerId?: string;
  status?: AppointmentStatus;
}

export interface OwnerAppointmentFilters {
  ownerId: string;
  when: "upcoming" | "past";
  now: Date;
  skip: number;
  take: number;
}

const professionalKey = (kind: ProfessionalKind) =>
  kind === "GROOMER" ? "groomerId" : "veterinarianId";

export class AppointmentsRepository {
  findById(id: string): Promise<AppointmentRecord | null> {
    return prisma.appointment.findUnique({ where: { id }, include: appointmentInclude });
  }

  findPatient(id: string): Promise<PatientStateRecord | null> {
    return prisma.patient.findUnique({
      where: { id },
      select: { id: true, ownerId: true, active: true },
    });
  }

  async findOwnerIdByUserId(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { ownerId: true } });
    return user?.ownerId ?? null;
  }

  async findProfileIds(
    userId: string,
  ): Promise<{ veterinarianId: string | null; groomerId: string | null }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { veterinarianId: true, groomerId: true },
    });
    return { veterinarianId: user?.veterinarianId ?? null, groomerId: user?.groomerId ?? null };
  }

  findProfessionals(kind: ProfessionalKind, id?: string): Promise<ProfessionalRecord[]> {
    const args = {
      where: { active: true, ...(id && { id }) },
      orderBy: [
        { firstNames: "asc" },
        { lastNames: "asc" },
      ] as Prisma.VeterinarianOrderByWithRelationInput[],
      select: {
        ...professionalSelect,
        schedules: { select: { weekday: true, startTime: true, endTime: true } },
      },
    };
    return kind === "GROOMER" ? prisma.groomer.findMany(args) : prisma.veterinarian.findMany(args);
  }

  async findBusy(
    kind: ProfessionalKind,
    professionalIds: string[],
    from: Date,
    to: Date,
    excludeAppointmentId?: string,
  ): Promise<BusyRecord[]> {
    const key = professionalKey(kind);
    const rows = await prisma.appointment.findMany({
      where: {
        [key]: { in: professionalIds },
        status: { in: OCCUPYING_STATUSES },
        startsAt: { lt: to },
        endsAt: { gt: from },
        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
      },
      select: { veterinarianId: true, groomerId: true, startsAt: true, endsAt: true },
    });
    return rows.map((row) => ({
      professionalId: (kind === "GROOMER" ? row.groomerId : row.veterinarianId) ?? "",
      startsAt: row.startsAt,
      endsAt: row.endsAt,
    }));
  }

  countActiveFuture(patientId: string, now: Date): Promise<number> {
    return prisma.appointment.count({
      where: { patientId, status: { in: ACTIVE_STATUSES }, startsAt: { gt: now } },
    });
  }

  async create(data: NewAppointmentData): Promise<AppointmentRecord> {
    const { kind, professionalId, ...rest } = data;
    try {
      return await prisma.appointment.create({
        data: { ...rest, [professionalKey(kind)]: professionalId },
        include: appointmentInclude,
      });
    } catch (error) {
      const target = slotTargetOf(error);
      throw target ? new SlotTakenError(target) : error;
    }
  }

  async update(
    id: string,
    kind: ProfessionalKind,
    changes: AppointmentChanges,
  ): Promise<AppointmentRecord> {
    const { professionalId, ...rest } = changes;
    try {
      return await prisma.appointment.update({
        where: { id },
        data: { ...rest, ...(professionalId && { [professionalKey(kind)]: professionalId }) },
        include: appointmentInclude,
      });
    } catch (error) {
      const target = slotTargetOf(error);
      throw target ? new SlotTakenError(target) : error;
    }
  }

  listAgenda({
    from,
    to,
    veterinarianId,
    groomerId,
    status,
  }: AgendaFilters): Promise<AppointmentRecord[]> {
    return prisma.appointment.findMany({
      where: {
        startsAt: { gte: from, lt: to },
        ...(veterinarianId && { veterinarianId }),
        ...(groomerId && { groomerId }),
        ...(status && { status }),
      },
      orderBy: { startsAt: "asc" },
      include: appointmentInclude,
    });
  }

  async listForOwner({
    ownerId,
    when,
    now,
    skip,
    take,
  }: OwnerAppointmentFilters): Promise<{ items: AppointmentRecord[]; total: number }> {
    const upcoming: Prisma.AppointmentWhereInput = {
      status: { in: ACTIVE_STATUSES },
      startsAt: { gte: now },
    };
    const where: Prisma.AppointmentWhereInput = {
      patient: { ownerId },
      ...(when === "upcoming" ? upcoming : { NOT: upcoming }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.appointment.findMany({
        where,
        orderBy: { startsAt: when === "upcoming" ? "asc" : "desc" },
        skip,
        take,
        include: appointmentInclude,
      }),
      prisma.appointment.count({ where }),
    ]);
    return { items, total };
  }
}
