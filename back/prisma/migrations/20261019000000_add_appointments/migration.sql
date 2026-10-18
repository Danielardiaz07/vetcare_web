-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'ATTENDED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "Appointment" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "veterinarianId" UUID,
    "groomerId" UUID,
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reason" VARCHAR(200),
    "cancelReason" VARCHAR(200),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_patientId_startsAt_idx" ON "Appointment"("patientId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_veterinarianId_startsAt_idx" ON "Appointment"("veterinarianId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_groomerId_startsAt_idx" ON "Appointment"("groomerId", "startsAt");

-- CreateIndex
CREATE INDEX "Appointment_startsAt_idx" ON "Appointment"("startsAt");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_groomerId_fkey" FOREIGN KEY ("groomerId") REFERENCES "Groomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reglas que Prisma no expresa. La estética la atiende un estilista; el resto, un veterinario (D-21).
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_professional_chk" CHECK (
    ("type" = 'GROOMING' AND "groomerId" IS NOT NULL AND "veterinarianId" IS NULL)
    OR ("type" <> 'GROOMING' AND "veterinarianId" IS NOT NULL AND "groomerId" IS NULL)
);
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_time_order_chk" CHECK ("startsAt" < "endsAt");

-- RN-27: el bloqueo de la franja lo garantiza la base. Dos franjas activas del mismo veterinario,
-- estilista o mascota no pueden cruzarse (RN-23, RN-32); las adyacentes sí. Cancelar o no asistir libera.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_veterinarian_no_overlap"
    EXCLUDE USING gist ("veterinarianId" WITH =, tstzrange("startsAt", "endsAt") WITH &&)
    WHERE ("veterinarianId" IS NOT NULL AND "status" IN ('SCHEDULED', 'CONFIRMED', 'ATTENDED'));
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_groomer_no_overlap"
    EXCLUDE USING gist ("groomerId" WITH =, tstzrange("startsAt", "endsAt") WITH &&)
    WHERE ("groomerId" IS NOT NULL AND "status" IN ('SCHEDULED', 'CONFIRMED', 'ATTENDED'));
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patient_no_overlap"
    EXCLUDE USING gist ("patientId" WITH =, tstzrange("startsAt", "endsAt") WITH &&)
    WHERE ("status" IN ('SCHEDULED', 'CONFIRMED', 'ATTENDED'));
