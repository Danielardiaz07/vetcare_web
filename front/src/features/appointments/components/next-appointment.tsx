import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";
import { ROUTES } from "@/lib/constants";
import type { Appointment } from "@/types/domain";

const linkClasses =
  "inline-flex min-h-11 items-center justify-center rounded-control px-5 font-medium transition-colors duration-150 ease-out";

export function NextAppointment({ appointment }: { appointment: Appointment | null }) {
  return (
    <section aria-labelledby="next-appointment-title" className="flex flex-col gap-4">
      <h2 id="next-appointment-title" className="text-xl font-semibold text-ink">
        Próxima cita
      </h2>
      {appointment ? (
        <>
          <AppointmentCard appointment={appointment} withPrep />
          <Link
            href={ROUTES.portalAppointments}
            className={`${linkClasses} self-start border border-field-border bg-surface text-ink hover:bg-brand-50`}
          >
            Ver mis citas
          </Link>
        </>
      ) : (
        <EmptyState
          title="No tienes citas próximas"
          description="Cuando agendes una cita la verás aquí, con su fecha, hora y cómo prepararte."
          action={
            <Link
              href={ROUTES.portalNewAppointment}
              className={`${linkClasses} bg-brand-600 text-white hover:bg-brand-700`}
            >
              Agendar cita
            </Link>
          }
        />
      )}
    </section>
  );
}
