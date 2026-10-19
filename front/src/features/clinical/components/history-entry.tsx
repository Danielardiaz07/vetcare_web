import { ownerFullName } from "@/features/owners/labels";
import { clinicDateOf } from "@/lib/clinic-time";
import { formatDate } from "@/lib/format";
import type { HistoryEntry as Entry } from "@/types/domain";

type HistoryEntryProps = {
  entry: Entry;
};

// RN-42: las notas internas nunca se muestran en el portal.
export function HistoryEntry({ entry }: HistoryEntryProps) {
  const { date, title, detail, professional } =
    entry.kind === "CONSULTATION"
      ? {
          date: clinicDateOf(new Date(entry.consultation.createdAt)),
          title: entry.consultation.diagnosis,
          detail: entry.consultation.treatment,
          professional: entry.consultation.veterinarian,
        }
      : {
          date: entry.vaccination.appliedAt,
          title: entry.vaccination.vaccine.name,
          detail: entry.vaccination.nextDoseAt
            ? `Lote ${entry.vaccination.lot} · Próxima dosis: ${formatDate(entry.vaccination.nextDoseAt)}`
            : `Lote ${entry.vaccination.lot} · Sin próxima dosis`,
          professional: entry.vaccination.veterinarian,
        };

  return (
    <article className="flex flex-col gap-1 rounded-card border border-line bg-surface p-5">
      <time dateTime={date} className="text-sm text-subtle">
        {formatDate(date)}
      </time>
      <h3 className="font-semibold break-words text-ink">{title}</h3>
      <p className="break-words text-ink">{detail}</p>
      <p className="text-sm text-muted">Registró: {ownerFullName(professional)}</p>
    </article>
  );
}
