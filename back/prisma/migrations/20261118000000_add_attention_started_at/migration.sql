-- D-72: instante en que el veterinario inicia la atención de una cita confirmada.
ALTER TABLE "Appointment" ADD COLUMN "attentionStartedAt" TIMESTAMPTZ(3);
