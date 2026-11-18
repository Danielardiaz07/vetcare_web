-- D-70: cirugías y exámenes de laboratorio agendables por recepción.

-- Los valores nuevos del enum no se usan en esta migración: PostgreSQL no deja usar un valor agregado en la misma
-- transacción, por eso las reglas siguientes comparan el tipo como texto.
ALTER TYPE "AppointmentType" ADD VALUE 'SURGERY';
ALTER TYPE "AppointmentType" ADD VALUE 'LAB_EXAM';

CREATE TYPE "LabExamStatus" AS ENUM ('PENDING_RESULTS', 'WITH_RESULTS');

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN "procedureName" VARCHAR(80),
ADD COLUMN "instructions" VARCHAR(500);

ALTER TABLE "Surgery" ADD COLUMN "appointmentId" UUID;

-- Los exámenes que ya existían tienen resultados.
ALTER TABLE "LabExam" ADD COLUMN "appointmentId" UUID,
ADD COLUMN "status" "LabExamStatus" NOT NULL DEFAULT 'WITH_RESULTS',
ADD COLUMN "resultsAt" TIMESTAMPTZ(3),
ALTER COLUMN "results" DROP NOT NULL;

UPDATE "LabExam" SET "resultsAt" = "createdAt";

-- CreateIndex
CREATE UNIQUE INDEX "Surgery_appointmentId_key" ON "Surgery"("appointmentId");
CREATE UNIQUE INDEX "LabExam_appointmentId_key" ON "LabExam"("appointmentId");

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LabExam" ADD CONSTRAINT "LabExam_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reglas que Prisma no expresa. Solo la cirugía y el examen llevan nombre del procedimiento; el estado del examen,
-- los resultados y la fecha en que se cargaron van juntos.
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_procedure_chk" CHECK (
    ("type"::text IN ('SURGERY', 'LAB_EXAM')) = ("procedureName" IS NOT NULL)
);
ALTER TABLE "LabExam" ADD CONSTRAINT "LabExam_results_chk" CHECK (
    ("status" = 'WITH_RESULTS') = ("results" IS NOT NULL)
    AND ("results" IS NOT NULL) = ("resultsAt" IS NOT NULL)
);
