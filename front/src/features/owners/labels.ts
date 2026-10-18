import { DOCUMENT_TYPE_LABELS } from "@/features/auth/schemas";
import type { Owner, Species } from "@/types/domain";

export const SPECIES_LABELS: Record<Species, string> = {
  DOG: "Perro",
  CAT: "Gato",
  OTHER: "Otra",
};

export const ownerFullName = (owner: Pick<Owner, "firstNames" | "lastNames">) =>
  `${owner.firstNames} ${owner.lastNames}`;

// Recepción puede ver tipos que el registro no ofrece (NIT, RC, PPT); esos se muestran con su sigla.
export function ownerDocument(owner: Pick<Owner, "documentType" | "documentNumber">): string {
  const label =
    DOCUMENT_TYPE_LABELS[owner.documentType as keyof typeof DOCUMENT_TYPE_LABELS] ??
    owner.documentType;
  return `${label} ${owner.documentNumber}`;
}
