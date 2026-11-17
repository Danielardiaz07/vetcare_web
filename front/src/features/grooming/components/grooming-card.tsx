import { GROOMING_TYPE_LABELS } from "@/features/grooming/labels";
import { ownerFullName } from "@/features/owners/labels";
import { clinicDateOf } from "@/lib/clinic-time";
import { formatDate } from "@/lib/format";
import type { GroomingService } from "@/types/domain";

export function GroomingCard({ service }: { service: GroomingService }) {
  const date = clinicDateOf(new Date(service.createdAt));

  return (
    <article className="flex flex-col gap-1 rounded-card border border-line bg-surface p-5">
      <time dateTime={date} className="text-sm text-subtle">
        {formatDate(date)}
      </time>
      <h3 className="font-semibold text-ink">{GROOMING_TYPE_LABELS[service.type]}</h3>
      {service.observations && <p className="break-words text-ink">{service.observations}</p>}
      <p className="text-sm text-muted">Atendió: {ownerFullName(service.groomer)}</p>
    </article>
  );
}
