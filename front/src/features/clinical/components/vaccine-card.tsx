import { StatusBadge } from "@/components/ui/status-badge";
import { ownerFullName } from "@/features/owners/labels";
import { VACCINE_STATUS } from "@/features/clinical/labels";
import { formatDate } from "@/lib/format";
import type { Vaccination, VaccineStatus } from "@/types/domain";

type VaccineCardProps = {
  vaccination: Vaccination;
  // Solo la última dosis de cada vacuna tiene estado (D-27); las anteriores van sin badge.
  status?: VaccineStatus;
};

export function VaccineCard({ vaccination, status }: VaccineCardProps) {
  const badge = status ? VACCINE_STATUS[status] : undefined;
  const details: [string, string][] = [
    ["Aplicada", formatDate(vaccination.appliedAt)],
    ["Lote", vaccination.lot],
    [
      "Próxima dosis",
      vaccination.nextDoseAt ? formatDate(vaccination.nextDoseAt) : "Sin próxima dosis",
    ],
  ];

  return (
    <article className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold break-words text-ink">{vaccination.vaccine.name}</h3>
        {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {details.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-sm text-subtle">{label}</dt>
            <dd className="break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">Registró: {ownerFullName(vaccination.veterinarian)}</p>
    </article>
  );
}
