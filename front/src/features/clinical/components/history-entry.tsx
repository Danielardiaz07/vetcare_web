import type { ReactNode } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { VaccineCard } from "@/features/clinical/components/vaccine-card";
import { ownerFullName } from "@/features/owners/labels";
import { LAB_EXAM_STATUS } from "@/lib/appointment-procedures";
import { clinicDateOf, formatClinicTime } from "@/lib/clinic-time";
import { formatDate } from "@/lib/format";
import type { HistoryEntry as Entry, Hospitalization, VaccineStatus } from "@/types/domain";

type HistoryEntryProps = {
  entry: Entry;
  vaccineStatus?: VaccineStatus;
  // RN-42: solo el personal ve las notas internas; el portal nunca las recibe.
  showInternalNotes?: boolean;
  labAction?: ReactNode;
};

const dateOf = (instant: string) => clinicDateOf(new Date(instant));

const formatInstant = (instant: string) =>
  `${formatDate(dateOf(instant))}, ${formatClinicTime(instant)}`;

export function HistoryEntry({
  entry,
  vaccineStatus,
  showInternalNotes,
  labAction,
}: HistoryEntryProps) {
  switch (entry.kind) {
    case "VACCINATION":
      return <VaccineCard vaccination={entry.vaccination} status={vaccineStatus} />;
    case "CONSULTATION": {
      const { consultation } = entry;
      return (
        <EntryCard
          date={dateOf(consultation.createdAt)}
          title={consultation.diagnosis}
          author={ownerFullName(consultation.veterinarian)}
        >
          <p className="break-words text-ink">{consultation.treatment}</p>
          {showInternalNotes && consultation.internalNotes && (
            <p className="break-words text-sm text-muted">
              Notas internas: {consultation.internalNotes}
            </p>
          )}
        </EntryCard>
      );
    }
    case "SURGERY": {
      const { surgery } = entry;
      return (
        <EntryCard
          date={surgery.performedAt}
          title={surgery.procedure}
          author={ownerFullName(surgery.veterinarian)}
        >
          {surgery.notes && <p className="break-words text-ink">{surgery.notes}</p>}
        </EntryCard>
      );
    }
    case "LAB_EXAM": {
      const { labExam } = entry;
      const status = LAB_EXAM_STATUS[labExam.status] ?? LAB_EXAM_STATUS.WITH_RESULTS;
      return (
        <EntryCard
          date={labExam.performedAt}
          title={labExam.examType}
          author={ownerFullName(labExam.veterinarian)}
          badge={<StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
        >
          {labExam.results && (
            <p className="break-words whitespace-pre-line text-ink">{labExam.results}</p>
          )}
          {labExam.resultsAt && (
            <p className="text-sm text-muted">
              Resultados cargados el {formatDate(dateOf(labExam.resultsAt))}
            </p>
          )}
          {labAction}
        </EntryCard>
      );
    }
    case "HOSPITALIZATION":
      return <HospitalizationEntry hospitalization={entry.hospitalization} />;
  }
}

function HospitalizationEntry({ hospitalization }: { hospitalization: Hospitalization }) {
  const open = hospitalization.status === "ADMITTED";
  return (
    <EntryCard
      date={dateOf(hospitalization.admittedAt)}
      title={hospitalization.reason}
      author={ownerFullName(hospitalization.veterinarian)}
      badge={
        open ? (
          <StatusBadge tone="warning">En curso</StatusBadge>
        ) : (
          <StatusBadge tone="success">Con alta</StatusBadge>
        )
      }
    >
      <p className="text-sm text-muted">
        Ingreso: {formatInstant(hospitalization.admittedAt)}
        {hospitalization.dischargedAt && ` · Alta: ${formatInstant(hospitalization.dischargedAt)}`}
      </p>
      {hospitalization.dischargeNotes && (
        <p className="break-words text-ink">{hospitalization.dischargeNotes}</p>
      )}
    </EntryCard>
  );
}

type EntryCardProps = {
  date: string;
  title: string;
  author: string;
  badge?: ReactNode;
  children?: ReactNode;
};

function EntryCard({ date, title, author, badge, children }: EntryCardProps) {
  return (
    <article className="flex flex-col gap-1 rounded-card border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <time dateTime={date} className="text-sm text-subtle">
          {formatDate(date)}
        </time>
        {badge}
      </div>
      <h3 className="font-semibold break-words text-ink">{title}</h3>
      {children}
      <p className="text-sm text-muted">Registró: {author}</p>
    </article>
  );
}
