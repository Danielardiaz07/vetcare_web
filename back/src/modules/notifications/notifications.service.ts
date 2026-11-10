import { NotificationKind, type Notification } from "@prisma/client";
import {
  NOTIFICATION_BATCH_SIZE,
  NOTIFICATION_ERROR_MAX,
  NOTIFICATION_MAX_ATTEMPTS,
  REMINDER_LEAD_HOURS,
  VACCINE_NOTICE_DAYS,
} from "@/config/constants";
import { logger } from "@/config/logger";
import type {
  AppointmentEvent,
  IAppointmentNotifier,
} from "@/modules/appointments/appointment-notifier.interface";
import type {
  ListNotificationsQueryDto,
  NotificationResponseDto,
  RunSummaryDto,
} from "@/modules/notifications/dto/notifications.dto";
import {
  buildCancelledEmail,
  buildChangedEmail,
  buildConfirmedEmail,
  buildReminderEmail,
  buildVaccineDueEmail,
  type AppointmentEmailData,
  type EmailContent,
} from "@/modules/notifications/notifications.emails";
import type {
  AppointmentForEmail,
  NotificationsRepository,
} from "@/modules/notifications/notifications.repository";
import type { IMailProvider } from "@/shared/providers";
import { addDays, clinicDateOf } from "@/shared/utils/clinic-time";
import { paginate, skipOf, type Paginated } from "@/shared/utils/pagination";

const HOUR_MS = 60 * 60 * 1000;
const ISO_DATE_LENGTH = 10;

const EVENT_KIND: Record<AppointmentEvent, NotificationKind> = {
  CONFIRMED: NotificationKind.APPOINTMENT_CONFIRMED,
  CHANGED: NotificationKind.APPOINTMENT_CHANGED,
  CANCELLED: NotificationKind.APPOINTMENT_CANCELLED,
};

const EVENT_TEMPLATE: Record<AppointmentEvent, (data: AppointmentEmailData) => EmailContent> = {
  CONFIRMED: buildConfirmedEmail,
  CHANGED: buildChangedEmail,
  CANCELLED: buildCancelledEmail,
};

interface Recipient {
  firstNames: string;
  email: string | null;
  user: { email: string } | null;
}

// El correo del propietario; si no tiene, el de su cuenta.
const recipientOf = (owner: Recipient): string | null => owner.email ?? owner.user?.email ?? null;

function appointmentData(appointment: AppointmentForEmail): AppointmentEmailData {
  const professional = appointment.veterinarian ?? appointment.groomer;
  return {
    ownerName: appointment.patient.owner.firstNames,
    patientName: appointment.patient.name,
    type: appointment.type,
    startsAt: appointment.startsAt,
    professional: professional ? `${professional.firstNames} ${professional.lastNames}` : "",
    reason: appointment.reason,
    cancelReason: appointment.cancelReason,
  };
}

function toResponse(record: Notification): NotificationResponseDto {
  return {
    id: record.id,
    kind: record.kind,
    status: record.status,
    toEmail: record.toEmail,
    subject: record.subject,
    appointmentId: record.appointmentId,
    vaccinationId: record.vaccinationId,
    scheduledFor: record.scheduledFor,
    attempts: record.attempts,
    lastError: record.lastError,
    sentAt: record.sentAt,
    createdAt: record.createdAt,
  };
}

export class NotificationsService implements IAppointmentNotifier {
  private running = false;

  constructor(
    private readonly repository: NotificationsRepository,
    private readonly mail: IMailProvider,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  // RN-35: el aviso se registra en el acto y el envío sale en segundo plano, sin hacer esperar a quien agenda.
  // RN-38: cualquier fallo se registra y se ignora; la cita ya quedó guardada.
  async appointmentEvent(event: AppointmentEvent, appointmentId: string): Promise<void> {
    try {
      const appointment = await this.repository.findAppointmentForEmail(appointmentId);
      if (!appointment) return;
      const queued = await this.queueAppointmentNotice(
        EVENT_KIND[event],
        appointment,
        EVENT_TEMPLATE[event](appointmentData(appointment)),
      );
      if (queued) void this.deliver(queued);
    } catch (error) {
      logger.error(
        { err: error, appointmentId, event },
        "No se pudo registrar el aviso de la cita",
      );
    }
  }

  // CU-20: lo llama el programador y, a mano, el administrador. Si ya hay una ejecución en curso no hace nada.
  async runDue(): Promise<RunSummaryDto> {
    if (this.running) return { skipped: true, reminders: 0, vaccineNotices: 0, sent: 0, failed: 0 };
    this.running = true;
    try {
      const now = this.clock();
      const reminders = await this.queueReminders(now);
      const vaccineNotices = await this.queueVaccineNotices(now);
      const { sent, failed } = await this.deliverPending(now);
      return { skipped: false, reminders, vaccineNotices, sent, failed };
    } finally {
      this.running = false;
    }
  }

  async list(query: ListNotificationsQueryDto): Promise<Paginated<NotificationResponseDto>> {
    const { items, total } = await this.repository.list({
      status: query.status,
      kind: query.kind,
      skip: skipOf(query.page, query.limit),
      take: query.limit,
    });
    return paginate(items.map(toResponse), total, query.page, query.limit);
  }

  // RN-36: recordatorio cuando la cita entra en las próximas 24 horas, una sola vez por cada hora de inicio.
  private async queueReminders(now: Date): Promise<number> {
    const until = new Date(now.getTime() + REMINDER_LEAD_HOURS * HOUR_MS);
    let queued = 0;
    for (const appointment of await this.repository.appointmentsStartingBetween(now, until)) {
      const alreadyReminded = appointment.notifications.some(
        (notice) => notice.forStartsAt?.getTime() === appointment.startsAt.getTime(),
      );
      if (alreadyReminded) continue;
      const row = await this.queueAppointmentNotice(
        NotificationKind.APPOINTMENT_REMINDER,
        appointment,
        buildReminderEmail(appointmentData(appointment)),
      );
      if (row) queued += 1;
    }
    return queued;
  }

  // RN-37: aviso cuando la próxima dosis de la última aplicación cae en los próximos 7 días, una sola vez.
  private async queueVaccineNotices(now: Date): Promise<number> {
    const today = clinicDateOf(now);
    const limit = addDays(today, VACCINE_NOTICE_DAYS);
    let queued = 0;
    for (const dose of await this.repository.latestVaccinations()) {
      if (!dose.nextDoseAt || dose.notifications.length > 0) continue;
      const nextDoseAt = dose.nextDoseAt.toISOString().slice(0, ISO_DATE_LENGTH);
      if (nextDoseAt < today || nextDoseAt > limit) continue;
      const toEmail = recipientOf(dose.patient.owner);
      if (!toEmail) continue;

      const content = buildVaccineDueEmail({
        ownerName: dose.patient.owner.firstNames,
        patientName: dose.patient.name,
        vaccineName: dose.vaccine.name,
        nextDoseAt,
      });
      const row = await this.repository.createIfAbsent({
        kind: NotificationKind.VACCINE_DUE,
        vaccinationId: dose.id,
        toEmail,
        subject: content.subject,
        body: content.html,
        scheduledFor: now,
      });
      if (row) queued += 1;
    }
    return queued;
  }

  private async queueAppointmentNotice(
    kind: NotificationKind,
    appointment: AppointmentForEmail,
    content: EmailContent,
  ): Promise<Notification | null> {
    const toEmail = recipientOf(appointment.patient.owner);
    if (!toEmail) return null;
    return this.repository.createIfAbsent({
      kind,
      appointmentId: appointment.id,
      toEmail,
      subject: content.subject,
      body: content.html,
      scheduledFor: this.clock(),
      forStartsAt: appointment.startsAt,
    });
  }

  // RN-38: lo pendiente y lo fallido se reintenta, hasta NOTIFICATION_MAX_ATTEMPTS veces en total.
  private async deliverPending(now: Date): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    const rows = await this.repository.pending(
      now,
      NOTIFICATION_MAX_ATTEMPTS,
      NOTIFICATION_BATCH_SIZE,
    );
    for (const row of rows) {
      const delivered = await this.deliver(row);
      if (delivered === true) sent += 1;
      if (delivered === false) failed += 1;
    }
    return { sent, failed };
  }

  // true = enviado, false = falló, null = otro proceso se encargó. Nunca lanza.
  private async deliver(row: Notification): Promise<boolean | null> {
    try {
      if (!(await this.repository.claim(row.id, row.attempts))) return null;
      try {
        await this.mail.send({ to: row.toEmail, subject: row.subject, html: row.body });
        await this.repository.markSent(row.id, this.clock());
        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await this.repository.markFailed(row.id, message.slice(0, NOTIFICATION_ERROR_MAX));
        return false;
      }
    } catch (error) {
      logger.error({ err: error, notificationId: row.id }, "No se pudo entregar el aviso");
      return null;
    }
  }
}
