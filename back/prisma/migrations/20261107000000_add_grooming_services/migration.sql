-- CreateEnum
CREATE TYPE "GroomingType" AS ENUM ('BATH', 'HAIRCUT', 'STYLING');

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "groomingServiceId" UUID;

-- CreateTable
CREATE TABLE "GroomingService" (
    "id" UUID NOT NULL,
    "appointmentId" UUID,
    "patientId" UUID NOT NULL,
    "groomerId" UUID NOT NULL,
    "type" "GroomingType" NOT NULL,
    "observations" VARCHAR(500),
    "cost" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroomingService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroomingService_appointmentId_key" ON "GroomingService"("appointmentId");

-- CreateIndex
CREATE INDEX "GroomingService_patientId_createdAt_idx" ON "GroomingService"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceItem_groomingServiceId_key" ON "InvoiceItem"("groomingServiceId");

-- AddForeignKey
ALTER TABLE "GroomingService" ADD CONSTRAINT "GroomingService_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroomingService" ADD CONSTRAINT "GroomingService_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroomingService" ADD CONSTRAINT "GroomingService_groomerId_fkey" FOREIGN KEY ("groomerId") REFERENCES "Groomer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_groomingServiceId_fkey" FOREIGN KEY ("groomingServiceId") REFERENCES "GroomingService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Un detalle de factura nace de un solo concepto y, al anular la factura, se suelta (RN-73, RN-74).
ALTER TABLE "InvoiceItem" DROP CONSTRAINT "InvoiceItem_one_source_chk";
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_one_source_chk"
    CHECK (num_nonnulls("consultationId", "vaccinationId", "groomingServiceId") <= 1);

ALTER TABLE "GroomingService" ADD CONSTRAINT "GroomingService_cost_chk" CHECK ("cost" >= 0);