-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'VOIDED');

-- CreateTable
CREATE TABLE "Consultation" (
    "id" UUID NOT NULL,
    "appointmentId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "veterinarianId" UUID NOT NULL,
    "symptoms" VARCHAR(500) NOT NULL,
    "weightKg" DECIMAL(5,2) NOT NULL,
    "temperatureC" DECIMAL(3,1) NOT NULL,
    "diagnosis" VARCHAR(500) NOT NULL,
    "treatment" VARCHAR(500) NOT NULL,
    "prescription" VARCHAR(1000),
    "internalNotes" VARCHAR(1000),
    "cost" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groomerId" UUID,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccine" (
    "id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Vaccine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccination" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "veterinarianId" UUID NOT NULL,
    "vaccineId" UUID NOT NULL,
    "lot" VARCHAR(30) NOT NULL,
    "appliedAt" DATE NOT NULL,
    "nextDoseAt" DATE,
    "price" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "groomerId" UUID,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "number" SERIAL NOT NULL,
    "ownerId" UUID NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PAID',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "voidReason" VARCHAR(200),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "consultationId" UUID,
    "vaccinationId" UUID,
    "description" VARCHAR(120) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "taxed" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_appointmentId_key" ON "Consultation"("appointmentId");

-- CreateIndex
CREATE INDEX "Consultation_patientId_createdAt_idx" ON "Consultation"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vaccine_name_key" ON "Vaccine"("name");

-- CreateIndex
CREATE INDEX "Vaccination_patientId_appliedAt_idx" ON "Vaccination"("patientId", "appliedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_ownerId_createdAt_idx" ON "Invoice"("ownerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_consultationId_key" ON "InvoiceItem"("consultationId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_vaccinationId_key" ON "InvoiceItem"("vaccinationId");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_groomerId_fkey" FOREIGN KEY ("groomerId") REFERENCES "Groomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_veterinarianId_fkey" FOREIGN KEY ("veterinarianId") REFERENCES "Veterinarian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "Vaccine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_groomerId_fkey" FOREIGN KEY ("groomerId") REFERENCES "Groomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Owner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_vaccinationId_fkey" FOREIGN KEY ("vaccinationId") REFERENCES "Vaccination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reglas que Prisma no expresa. Un detalle de factura referencia exactamente una consulta o una vacunación (RN-73).
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_one_source_chk"
    CHECK (("consultationId" IS NOT NULL) <> ("vaccinationId" IS NOT NULL));
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_amount_chk" CHECK ("amount" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_totals_chk"
    CHECK ("subtotal" >= 0 AND "tax" >= 0 AND "total" = "subtotal" + "tax");
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_cost_chk" CHECK ("cost" >= 0);

-- Catalogo minimo de vacunas (D-27); precios de referencia en COP, editables despues.
INSERT INTO "Vaccine" ("id", "name", "price") VALUES
    (gen_random_uuid(), 'Triple felina', 60000),
    (gen_random_uuid(), 'Antirrabica', 40000),
    (gen_random_uuid(), 'Parvovirus', 55000),
    (gen_random_uuid(), 'Quintuple canina', 70000);
