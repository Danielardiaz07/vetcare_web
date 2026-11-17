import {
  AppointmentStatus,
  NotificationKind,
  NotificationStatus,
  Prisma,
  type Notification,
} from "@prisma/client";
import { prisma } from "@/shared/prisma";

const UNIQUE_VIOLATION = "P2002";

const ownerSelect = {
  firstNames: true,
  email: true,
  user: { select: { email: true } },
} as const;

const appointmentSelect = {
  id: true,
  type: true,
  status: true,
  startsAt: true,
  reason: true,
  cancelReason: true,
  patient: { select: { name: true, owner: { select: ownerSelect } } },
  veterinarian: { select: { firstNames: true, lastNames: true } },
  groomer: { select: { firstNames: true, lastNames: true } },
} satisfies Prisma.AppointmentSelect;

export type AppointmentForEmail = Prisma.AppointmentGetPayload<{
  select: typeof appointmentSelect;
}>;
export type AppointmentWithReminders = AppointmentForEmail & {
  notifications: { forStartsAt: Date | null }[];
};

const vaccinationSelect = {
  id: true,
  nextDoseAt: true,
  vaccine: { select: { name: true } },
  patient: { select: { name: true, owner: { select: ownerSelect } } },
  notifications: { where: { kind: NotificationKind.VACCINE_DUE }, select: { id: true } },
} satisfies Prisma.VaccinationSelect;

export type VaccinationForNotice = Prisma.VaccinationGetPayload<{
  select: typeof vaccinationSelect;
}>;

export interface NewNotificationData {
  kind: NotificationKind;
  appointmentId?: string;
  vaccinationId?: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledFor: Date;
  forStartsAt?: Date;
}

export interface NotificationListFilters {
  status?: NotificationStatus;
  kind?: NotificationKind;
  skip: number;
  take: number;
}

const PENDING_STATUSES = [NotificationStatus.PENDING, NotificationStatus.FAILED];

export class NotificationsRepository {
  findAppointmentForEmail(id: string): Promise<AppointmentForEmail | null> {
    return prisma.appointment.findUnique({ where: { id }, select: appointmentSelect });
  }

  // Citas que empiezan dentro de la ventana, con los recordatorios que ya tienen (RN-36).
  appointmentsStartingBetween(from: Date, to: Date): Promise<AppointmentWithReminders[]> {
    return prisma.appointment.findMany({
      where: {
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        startsAt: { gt: from, lte: to },
      },
      select: {
        ...appointmentSelect,
        notifications: {
          where: { kind: NotificationKind.APPOINTMENT_REMINDER },
          select: { forStartsAt: true },
        },
      },
      orderBy: { startsAt: "asc" },
    });
  }

  // Última dosis de cada vacuna de cada mascota activa (RN-49): una dosis anterior no genera aviso.
  latestVaccinations(): Promise<VaccinationForNotice[]> {
    return prisma.vaccination.findMany({
      where: { patient: { active: true } },
      distinct: ["patientId", "vaccineId"],
      orderBy: [
        { patientId: "asc" },
        { vaccineId: "asc" },
        { appliedAt: "desc" },
        { createdAt: "desc" },
      ],
      select: vaccinationSelect,
    });
  }

  create(data: NewNotificationData): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  // null si otro proceso ya creó el mismo aviso (índices únicos parciales de la migración).
  async createIfAbsent(data: NewNotificationData): Promise<Notification | null> {
    try {
      return await this.create(data);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_VIOLATION
      ) {
        return null;
      }
      throw error;
    }
  }

  pending(now: Date, maxAttempts: number, take: number): Promise<Notification[]> {
    return prisma.notification.findMany({
      where: {
        status: { in: PENDING_STATUSES },
        attempts: { lt: maxAttempts },
        scheduledFor: { lte: now },
      },
      orderBy: { scheduledFor: "asc" },
      take,
    });
  }

  // Reserva el envío: solo gana quien encuentra el contador de intentos que leyó, así dos instancias no envían el mismo correo.
  async claim(id: string, attempts: number): Promise<boolean> {
    const claimed = await prisma.notification.updateMany({
      where: { id, attempts, status: { in: PENDING_STATUSES } },
      data: { attempts: { increment: 1 } },
    });
    return claimed.count === 1;
  }

  async markSent(id: string, sentAt: Date): Promise<void> {
    await prisma.notification.updateMany({
      where: { id },
      data: { status: NotificationStatus.SENT, sentAt, lastError: null },
    });
  }

  async markFailed(id: string, lastError: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id },
      data: { status: NotificationStatus.FAILED, lastError },
    });
  }

  async list(filters: NotificationListFilters): Promise<{ items: Notification[]; total: number }> {
    const where: Prisma.NotificationWhereInput = {
      ...(filters.status && { status: filters.status }),
      ...(filters.kind && { kind: filters.kind }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.notification.count({ where }),
    ]);
    return { items, total };
  }
}
