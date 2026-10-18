import type { Sex, Species } from "@/types/domain";

export const SPECIES_OPTIONS = ["DOG", "CAT", "OTHER"] as const satisfies readonly Species[];
export const SEX_OPTIONS = ["MALE", "FEMALE"] as const satisfies readonly Sex[];

export const SPECIES_LABELS: Record<Species, string> = {
  DOG: "Perro",
  CAT: "Gato",
  OTHER: "Otro",
};

export const SEX_LABELS: Record<Sex, string> = {
  MALE: "Macho",
  FEMALE: "Hembra",
};
