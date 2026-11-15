"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { SPECIES_OPTIONS } from "@/features/patients/labels";
import { bookableDates, clinicDateOf } from "@/lib/clinic-time";
import { FIELD_LIMITS } from "@/lib/constants";

export const ANY_PROFESSIONAL = "any";
export const NEW_PET = "new";
const STORAGE_KEY = "vetcare-landing-booking";
const draftSchema = z.object({
  petName: z.string().max(FIELD_LIMITS.PATIENT_NAME_MAX),
  species: z.enum(SPECIES_OPTIONS).nullable(),
  petId: z.union([z.uuid(), z.literal(NEW_PET)]).nullable(),
  userId: z.uuid().nullable(),
  type: z.enum(["GENERAL_CONSULTATION", "VACCINATION", "CHECKUP", "GROOMING"]).nullable(),
  professionalId: z.union([z.uuid(), z.literal(ANY_PROFESSIONAL)]).nullable(),
  date: z.iso.date(),
  slot: z.object({ startsAt: z.iso.datetime(), endsAt: z.iso.datetime() }).nullable(),
  resumeReview: z.boolean(),
});

export type BookingDraft = z.infer<typeof draftSchema>;

export function emptyBookingDraft(): BookingDraft {
  return {
    petName: "",
    species: null,
    petId: null,
    userId: null,
    type: null,
    professionalId: null,
    date: clinicDateOf(new Date()),
    slot: null,
    resumeReview: false,
  };
}

export function useBookingDraft() {
  const [draft, setDraft] = useState<BookingDraft | null>(null);

  useEffect(() => {
    let next = emptyBookingDraft();
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      const parsed = draftSchema.safeParse(stored ? JSON.parse(stored) : null);
      if (parsed.success) next = parsed.data;
    } catch {
      // El formulario sigue funcionando si el navegador bloquea el almacenamiento.
    }
    const dates = bookableDates();
    const today = clinicDateOf(new Date());
    if (next.date < today || next.date > (dates.at(-1) ?? today)) {
      next = { ...next, date: today, slot: null };
    }
    setDraft(next);
  }, []);

  useEffect(() => {
    if (!draft) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      // La continuidad en la página no depende de sessionStorage.
    }
  }, [draft]);

  return { draft, setDraft };
}
