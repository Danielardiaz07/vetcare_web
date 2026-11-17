-- AlterTable
ALTER TABLE "Vaccine" ADD COLUMN     "expiresAt" DATE,
ADD COLUMN     "minStock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Medication" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Medication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Medication_name_key" ON "Medication"("name");


-- RN-57: el stock nunca queda negativo; el mínimo tampoco.
ALTER TABLE "Vaccine" ADD CONSTRAINT "Vaccine_stock_chk" CHECK ("stock" >= 0 AND "minStock" >= 0);
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_stock_chk" CHECK ("stock" >= 0 AND "minStock" >= 0);
ALTER TABLE "Medication" ADD CONSTRAINT "Medication_price_chk" CHECK ("price" >= 0);