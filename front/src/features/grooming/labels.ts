import type { GroomingType } from "@/types/domain";

// RN-51: tipos del servicio estético.
export const GROOMING_TYPE_LABELS: Record<GroomingType, string> = {
  BATH: "Baño",
  HAIRCUT: "Corte",
  STYLING: "Peluquería",
};

export const GROOMING_TYPES = Object.keys(GROOMING_TYPE_LABELS) as GroomingType[];
