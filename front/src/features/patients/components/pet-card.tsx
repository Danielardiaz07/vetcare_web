import Link from "next/link";
import { PatientAvatar } from "@/features/patients/components/patient-avatar";
import { SPECIES_LABELS } from "@/features/patients/labels";
import { ROUTES } from "@/lib/constants";
import { calculateAge } from "@/lib/format";
import type { Patient } from "@/types/domain";

export function PetCard({ pet }: { pet: Patient }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <PatientAvatar name={pet.name} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-semibold text-ink">{pet.name}</span>
          <span className="text-sm text-muted">
            {SPECIES_LABELS[pet.species]} · {calculateAge(pet.birthDate)}
          </span>
        </div>
      </div>
      <Link
        href={ROUTES.portalPetHistory(pet.id)}
        aria-label={`Ver historial de ${pet.name}`}
        className="inline-flex min-h-11 shrink-0 items-center rounded-control px-3 font-semibold text-brand-700 underline underline-offset-2 hover:bg-brand-50"
      >
        Ver historial
      </Link>
    </div>
  );
}
