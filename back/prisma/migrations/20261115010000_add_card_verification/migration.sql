-- CreateTable
CREATE TABLE "CardVerification" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "token" VARCHAR(43) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedAt" TIMESTAMPTZ(3),

    CONSTRAINT "CardVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CardVerification_patientId_key" ON "CardVerification"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "CardVerification_token_key" ON "CardVerification"("token");

-- AddForeignKey
ALTER TABLE "CardVerification" ADD CONSTRAINT "CardVerification_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;