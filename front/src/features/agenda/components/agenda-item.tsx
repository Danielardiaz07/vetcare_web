import { cn } from "@/components/ui/cn";
import { StatusBadge } from "@/components/ui/status-badge";
import { APPOINTMENT_TYPE_LABELS, durationLabel } from "@/features/staff/labels";
import { APPOINTMENT_STATUS } from "@/lib/appointment-status";
import { formatClinicTime } from "@/lib/clinic-time";
import type { Appointment } from "@/types/domain";

const MS_PER_MINUTE = 60 * 1000;

export const durationOf = ({ startsAt, endsAt }: Appointment) =>
  (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / MS_PER_MINUTE;

type AgendaItemProps = {
  appointment: Appointment;
  onOpen: (appointment: Appointment) => void;
  compact?: boolean;
};

export function AgendaItem({ appointment, onOpen, compact = false }: AgendaItemProps) {
  const badge = APPOINTMENT_STATUS[appointment.status];
  const type = APPOINTMENT_TYPE_LABELS[appointment.type];
  const time = formatClinicTime(appointment.startsAt);
  const inactive = appointment.status === "CANCELLED" || appointment.status === "NO_SHOW";

  return (
    <button
      type="button"
      onClick={() => onOpen(appointment)}
      aria-label={`${time}, ${appointment.patient.name}, ${type}, ${badge.label}. Ver detalle`}
      className={cn(
        "flex w-full gap-3 rounded-control border border-line bg-surface p-3 text-left transition-colors duration-150 ease-out hover:bg-brand-50",
        compact ? "flex-col gap-1" : "items-start",
        inactive && "opacity-70",
      )}
    >
      <span className={cn("flex flex-col", !compact && "w-24 shrink-0")}>
        <span className="font-semibold text-ink">{time}</span>
        <span className="text-sm text-muted">{durationLabel(durationOf(appointment))}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-semibold break-words text-ink">{appointment.patient.name}</span>
        <span className="text-sm text-muted">{type}</span>
        <span>
          <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
        </span>
      </span>
    </button>
  );
}
