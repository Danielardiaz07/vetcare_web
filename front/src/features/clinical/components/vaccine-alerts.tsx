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

export function VaccineAlerts({ items }: { items: PetVaccines[] }) {
  const alerts = items.flatMap(({ pet, card }) =>
    card
      .filter((entry) => entry.nextDoseAt && needsVaccineAlert(entry.status))
      .map((entry) => ({ pet, entry, nextDoseAt: entry.nextDoseAt ?? "" })),
  );
  if (alerts.length === 0) return null;

  return (
    <section aria-label="Recordatorios" className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Recordatorios</h2>
      <ul aria-label="Vacunas pendientes" className="flex flex-col gap-2">
        {alerts.map(({ pet, entry, nextDoseAt }) => {
          const overdue = entry.status === "OVERDUE";
          return (
            <li
              key={entry.id}
              className={cn(
                "flex flex-col gap-1 rounded-card border px-4 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3",
                overdue
                  ? "border-danger-border bg-danger-bg"
                  : "border-warning-border bg-warning-bg",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <Icon
                  name="alert"
                  className={cn("mt-0.5 size-5 shrink-0", overdue ? "text-danger" : "text-warning")}
                />
                <p className="min-w-0 break-words text-sm text-ink">
                  <span className="font-semibold">{pet.name}</span>: la vacuna{" "}
                  <span className="font-semibold">{entry.vaccine.name}</span>{" "}
                  {overdue ? "venció el" : "vence el"} {formatDate(nextDoseAt)}.
                </p>
              </div>
              <Link
                href={scheduleHref(pet.id)}
                className="ml-8 inline-flex min-h-11 shrink-0 items-center self-start rounded-control text-sm font-medium text-brand-700 underline underline-offset-4 transition-colors duration-150 ease-out hover:text-ink sm:ml-0 sm:self-auto"
              >
                Agendar vacunación
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
