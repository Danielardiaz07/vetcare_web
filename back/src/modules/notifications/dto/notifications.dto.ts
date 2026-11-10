import { NotificationKind, NotificationStatus } from "@prisma/client";
import { z } from "zod";
import { paginationQuerySchema } from "@/shared/utils/pagination";

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(NotificationStatus).optional(),
  kind: z.enum(NotificationKind).optional(),
});

export type ListNotificationsQueryDto = z.infer<typeof listNotificationsQuerySchema>;

export interface NotificationResponseDto {
  id: string;
  kind: NotificationKind;
  status: NotificationStatus;
  toEmail: string;
  subject: string;
  appointmentId: string | null;
  vaccinationId: string | null;
  scheduledFor: Date;
  attempts: number;
  lastError: string | null;
  sentAt: Date | null;
  createdAt: Date;
}

export interface RunSummaryDto {
  skipped: boolean; // true si ya había una ejecución en curso
  reminders: number; // recordatorios de cita encolados
  vaccineNotices: number; // avisos de vacuna encolados
  sent: number;
  failed: number;
}
