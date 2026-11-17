-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('GENERAL_CONSULTATION', 'VACCINATION', 'CHECKUP', 'GROOMING');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "groomerId" UUID,
ADD COLUMN     "veterinarianId" UUID;

-- CreateTable
CREATE TABLE "Veterinarian" (
    "id" UUID NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'CC',
    "documentNumber" VARCHAR(15) NOT NULL,
    "firstNames" VARCHAR(60) NOT NULL,
    "lastNames" VARCHAR(60) NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "specialty" VARCHAR(60) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Veterinarian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Groomer" (
    "id" UUID NOT NULL,
    "documentType" "DocumentType" NOT NULL DEFAULT 'CC',
    "documentNumber" VARCHAR(15) NOT NULL,
    "firstNames" VARCHAR(60) NOT NULL,
    "lastNames" VARCHAR(60) NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Groomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" UUID NOT NULL,
    "veterinarianId" UUID,
    "groomerId" UUID,
    "weekday" SMALLINT NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentTypeSetting" (
    "type" "AppointmentType" NOT NULL,
    "durationMinutes" SMALLINT NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AppointmentTypeSetting_pkey" PRIMARY KEY ("type")
);

-- CreateIndex
CREATE UNIQUE INDEX "Veterinarian_documentNumber_key" ON "Veterinarian"("documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Groomer_documentNumber_key" ON "Groomer"("documentNumber");

-- CreateIndex
CREATE INDEX "Schedule_veterinarianId_weekday_idx" ON "Schedule"("veterinarianId", "weekday");

-- CreateIndex
CREATE INDEX "Schedule_groomerId_weekday_idx" ON "Schedule"("groomerId", "weekday");

-- CreateIndex
CREATE UNIQUE INDEX "User_veterinarianId_key" ON "User"("veterinarianId");

-- CreateIndex
CREATE UNIQUE INDEX "User_groomerId_key" ON "User"("groomerId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_groomerId_fkey" FOREIGN KEY ("groomerId") REFERENCES "Groomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_groomerId_fkey" FOREIGN KEY ("groomerId") REFERENCES "Groomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reglas que Prisma no expresa: un horario es de un veterinario o de un estilista, nunca de ambos ni de ninguno.
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_one_owner_chk"
    CHECK (("veterinarianId" IS NOT NULL) <> ("groomerId" IS NOT NULL));
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_weekday_chk" CHECK ("weekday" BETWEEN 1 AND 7);
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_time_order_chk" CHECK ("startTime" < "endTime");

-- La duración es un múltiplo positivo de la franja de 30 minutos (D-21).
ALTER TABLE "AppointmentTypeSetting" ADD CONSTRAINT "AppointmentTypeSetting_duration_chk"
    CHECK ("durationMinutes" > 0 AND "durationMinutes" % 30 = 0);

-- Duraciones iniciales (D-21, RN-19): configurables después por el administrador.
INSERT INTO "AppointmentTypeSetting" ("type", "durationMinutes", "updatedAt") VALUES
    ('GENERAL_CONSULTATION', 30, CURRENT_TIMESTAMP),
    ('VACCINATION', 30, CURRENT_TIMESTAMP),
    ('CHECKUP', 30, CURRENT_TIMESTAMP),
    ('GROOMING', 90, CURRENT_TIMESTAMP);
