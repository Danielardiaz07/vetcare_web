import { VaccineCard } from "@/features/clinical/components/vaccine-card";
import { ownerFullName } from "@/features/owners/labels";
import { clinicDateOf } from "@/lib/clinic-time";
import { formatDate } from "@/lib/format";
import type { HistoryEntry as Entry, VaccineStatus } from "@/types/domain";

type HistoryEntryProps = {
  entry: Entry;
  vaccineStatus?: VaccineStatus;
};

// RN-42: las notas internas nunca se muestran en el portal.
export function HistoryEntry({ entry, vaccineStatus }: HistoryEntryProps) {
  if (entry.kind === "VACCINATION") {
    return <VaccineCard vaccination={entry.vaccination} status={vaccineStatus} />;
  }

  const { consultation } = entry;
  const date = clinicDateOf(new Date(consultation.createdAt));

  return (
    <article className="flex flex-col gap-1 rounded-card border border-line bg-surface p-5">
      <time dateTime={date} className="text-sm text-subtle">
        {formatDate(date)}
      </time>
      <h3 className="font-semibold break-words text-ink">{consultation.diagnosis}</h3>
      <p className="break-words text-ink">{consultation.treatment}</p>
      <p className="text-sm text-muted">Registró: {ownerFullName(consultation.veterinarian)}</p>
    </article>
  );
}
