import Link from "next/link";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { needsVaccineAlert } from "@/features/clinical/labels";
import { ROUTES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Patient, VaccinationCardEntry } from "@/types/domain";

export type PetVaccines = { pet: Patient; card: VaccinationCardEntry[] };

const scheduleHref = (petId: string) =>
  `${ROUTES.portalNewAppointment}?petId=${petId}&type=VACCINATION`;

// RN-49: un aviso por cada vacuna por vencer o vencida, con el acceso para agendarla.
export function VaccineAlerts({ items }: { items: PetVaccines[] }) {
  const alerts = items.flatMap(({ pet, card }) =>
    card
      .filter((entry) => entry.nextDoseAt && needsVaccineAlert(entry.status))
      .map((entry) => ({ pet, entry, nextDoseAt: entry.nextDoseAt ?? "" })),
  );
  if (alerts.length === 0) return null;

  return (
    <ul aria-label="Vacunas pendientes" className="flex flex-col gap-3">
      {alerts.map(({ pet, entry, nextDoseAt }) => {
        const overdue = entry.status === "OVERDUE";
        return (
          <li
            key={entry.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-card border px-4 py-3",
              overdue ? "border-danger-border bg-danger-bg" : "border-warning-border bg-warning-bg",
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <Icon
                name="alert"
                className={cn("mt-0.5 size-5 shrink-0", overdue ? "text-danger" : "text-warning")}
              />
              <p className="min-w-0 break-words text-ink">
                <span className="font-semibold">{pet.name}</span>: la vacuna{" "}
                <span className="font-semibold">{entry.vaccine.name}</span>{" "}
                {overdue ? "venció el" : "vence el"} {formatDate(nextDoseAt)}.
              </p>
            </div>
            <Link
              href={scheduleHref(pet.id)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control bg-brand-600 px-5 font-medium text-white transition-colors duration-150 ease-out hover:bg-brand-700"
            >
              Agendar vacunación
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
