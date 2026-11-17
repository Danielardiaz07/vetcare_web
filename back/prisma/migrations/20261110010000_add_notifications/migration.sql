-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('APPOINTMENT_CONFIRMED', 'APPOINTMENT_CHANGED', 'APPOINTMENT_CANCELLED', 'APPOINTMENT_REMINDER', 'VACCINE_DUE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "appointmentId" UUID,
    "vaccinationId" UUID,
    "toEmail" VARCHAR(254) NOT NULL,
    "subject" VARCHAR(150) NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "scheduledFor" TIMESTAMPTZ(3) NOT NULL,
    "forStartsAt" TIMESTAMPTZ(3),
    "attempts" SMALLINT NOT NULL DEFAULT 0,
    "lastError" VARCHAR(300),
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_status_scheduledFor_idx" ON "Notification"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "Notification_appointmentId_idx" ON "Notification"("appointmentId");

-- CreateIndex
CREATE INDEX "Notification_vaccinationId_idx" ON "Notification"("vaccinationId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_vaccinationId_fkey" FOREIGN KEY ("vaccinationId") REFERENCES "Vaccination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- D-38: sin duplicados. Un recordatorio por cada hora de inicio de la cita (si se reprograma, puede haber otro) y un aviso por vacunación.
CREATE UNIQUE INDEX "Notification_one_reminder_idx" ON "Notification"("appointmentId", "forStartsAt") WHERE "kind" = 'APPOINTMENT_REMINDER';
CREATE UNIQUE INDEX "Notification_one_vaccine_notice_idx" ON "Notification"("vaccinationId") WHERE "kind" = 'VACCINE_DUE';

-- Cada aviso apunta a una cita o a una vacunación, nunca a ambas ni a ninguna.
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_target_chk" CHECK (num_nonnulls("appointmentId", "vaccinationId") = 1);
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_attempts_chk" CHECK ("attempts" >= 0);