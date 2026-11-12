"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { AppointmentWizard } from "@/features/appointments/components/appointment-wizard";
import { useAuth } from "@/features/auth/auth-provider";
import { homeRouteFor } from "@/features/auth/redirects";
import { useLandingBooking } from "@/features/landing/booking-context";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { BOOKING_SECTION_ID, CLINIC, emergencyPhoneUrl } from "@/features/landing/content";
import { MIN_APPOINTMENT_LEAD_HOURS } from "@/lib/constants";

const BOOKING_PERKS = [
  "Solo ves las horas que están libres",
  `Reprograma o cancela hasta ${MIN_APPOINTMENT_LEAD_HOURS} horas antes`,
  "Las citas de todas tus mascotas en un solo lugar",
];

function BookingPanel() {
  const { user, status } = useAuth();
  const { type, requestBooking, openLogin } = useLandingBooking();

  if (status === "loading") return <LoadingState rows={2} />;

  if (!user) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-6">
        <span className="flex size-11 items-center justify-center rounded-chip bg-brand-100 text-brand-700">
          <Icon name="calendar-plus" />
        </span>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-ink">Entra para elegir a tu mascota</h3>
          <p className="text-muted">
            La cita queda a nombre de tu cuenta, así que primero inicia sesión. Si aún no tienes
            cuenta, la creas en un momento.
          </p>
        </div>
        <div className="flex flex-col gap-3 self-stretch sm:flex-row sm:self-start">
          <Button onClick={() => requestBooking()}>
            <Icon name="calendar-plus" width={20} height={20} />
            Agendar cita
          </Button>
          <Button variant="secondary" onClick={() => openLogin("register")}>
            Crear cuenta
          </Button>
        </div>
      </div>
    );
  }

  if (user.role !== "OWNER") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-card border border-line bg-surface p-6">
        <h3 className="text-lg font-semibold text-ink">Las citas en línea son para propietarios</h3>
        <p className="text-muted">
          Con tu cuenta del equipo, las citas se agendan desde la agenda del panel, a nombre del
          propietario.
        </p>
        <Link
          href={homeRouteFor(user.role)}
          className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-700 hover:underline"
        >
          Ir al panel
          <Icon name="arrow-right" width={18} height={18} />
        </Link>
      </div>
    );
  }

  // Elegir otro servicio en la portada empieza de nuevo con ese tipo de cita ya marcado.
  return <AppointmentWizard key={type ?? "any"} initialType={type ?? undefined} />;
}

export function BookingSection() {
  return (
    <section id={BOOKING_SECTION_ID} aria-labelledby="agendar-title" className="scroll-mt-28">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6">
        <div className="flex flex-col gap-4">
          <SectionHeading id="agendar-title" title="Agenda tu cita">
            Elige la mascota, el tipo de cita, el veterinario o estilista (o cualquiera disponible),
            el día y la hora. Antes de confirmar ves el resumen completo.
          </SectionHeading>
          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {BOOKING_PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-2 text-ink">
                <span className="flex size-6 flex-none items-center justify-center rounded-full bg-success-bg text-success">
                  <Icon name="clipboard-check" width={14} height={14} />
                </span>
                {perk}
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted">
            <strong className="font-semibold text-ink">¿Es una urgencia?</strong> No esperes una
            cita: llama al{" "}
            <a href={emergencyPhoneUrl} className="font-semibold text-brand-700 underline">
              {CLINIC.emergencyPhone}
            </a>
            .
          </p>
        </div>
        <BookingPanel />
      </div>
    </section>
  );
}
