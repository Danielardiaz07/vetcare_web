-- CreateTable
CREATE TABLE "Surgery" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "veterinarianId" UUID NOT NULL,
    "procedure" VARCHAR(120) NOT NULL,
    "performedAt" DATE NOT NULL,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Surgery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hospitalization" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "veterinarianId" UUID NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "admittedAt" TIMESTAMPTZ(3) NOT NULL,
    "dischargedAt" TIMESTAMPTZ(3),
    "dischargeNotes" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hospitalization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabExam" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "veterinarianId" UUID NOT NULL,
    "examType" VARCHAR(80) NOT NULL,
    "performedAt" DATE NOT NULL,
    "results" VARCHAR(1000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabExam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Surgery_patientId_performedAt_idx" ON "Surgery"("patientId", "performedAt");

-- CreateIndex
CREATE INDEX "Hospitalization_patientId_admittedAt_idx" ON "Hospitalization"("patientId", "admittedAt");

-- CreateIndex
CREATE INDEX "LabExam_patientId_performedAt_idx" ON "LabExam"("patientId", "performedAt");

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Surgery" ADD CONSTRAINT "Surgery_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospitalization" ADD CONSTRAINT "Hospitalization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hospitalization" ADD CONSTRAINT "Hospitalization_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabExam" ADD CONSTRAINT "LabExam_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabExam" ADD CONSTRAINT "LabExam_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- RN-50, D-34: una mascota no puede tener dos internaciones abiertas a la vez, y el egreso es posterior al ingreso.
CREATE UNIQUE INDEX "Hospitalization_one_open_idx" ON "Hospitalization"("patientId") WHERE "dischargedAt" IS NULL;
ALTER TABLE "Hospitalization" ADD CONSTRAINT "Hospitalization_discharge_chk"
    CHECK ("dischargedAt" IS NULL OR "dischargedAt" >= "admittedAt");