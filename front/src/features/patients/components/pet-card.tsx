import Link from "next/link";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { PatientAvatar } from "@/features/patients/components/patient-avatar";
import { SPECIES_LABELS } from "@/features/patients/labels";
import { ROUTES } from "@/lib/constants";
import { calculateAge } from "@/lib/format";
import type { Patient, VaccinationCardEntry } from "@/types/domain";

const plural = (count: number, singular: string, many: string) =>
  `${count} ${count === 1 ? singular : many}`;

// RN-49: resumen del carné; lo vencido pesa más que lo que está por vencer.
function vaccineSummary(card: VaccinationCardEntry[]): { label: string; tone: StatusTone } {
  const overdue = card.filter((entry) => entry.status === "OVERDUE").length;
  const dueSoon = card.filter((entry) => entry.status === "DUE_SOON").length;
  if (overdue > 0) {
    return { label: plural(overdue, "vacuna vencida", "vacunas vencidas"), tone: "danger" };
  }
  if (dueSoon > 0) {
    return { label: plural(dueSoon, "vacuna por vencer", "vacunas por vencer"), tone: "warning" };
  }
  if (card.length === 0) return { label: "Sin vacunas registradas", tone: "neutral" };
  return { label: "Vacunas al día", tone: "success" };
}

type PetCardProps = {
  pet: Patient;
  card?: VaccinationCardEntry[];
};

export function PetCard({ pet, card }: PetCardProps) {
  const summary = card ? vaccineSummary(card) : undefined;

  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <PatientAvatar name={pet.name} />
        <div className="flex min-w-0 flex-col items-start gap-1">
          <span className="max-w-full truncate font-semibold text-ink">{pet.name}</span>
          <span className="text-sm text-muted">
            {SPECIES_LABELS[pet.species]} · {calculateAge(pet.birthDate)}
          </span>
          {summary && <StatusBadge tone={summary.tone}>{summary.label}</StatusBadge>}
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
