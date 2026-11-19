import { Icon } from "@/components/ui/icon";
import { LandingBookingForm } from "@/features/landing/components/landing-booking-form";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { BOOKING_SECTION_ID, CLINIC, emergencyPhoneUrl } from "@/features/landing/content";
import { MIN_APPOINTMENT_LEAD_HOURS } from "@/lib/constants";

const BOOKING_PERKS = [
  "Solo ves las horas que están libres",
  `Reprograma o cancela hasta ${MIN_APPOINTMENT_LEAD_HOURS} horas antes`,
  "Las citas de todas tus mascotas en un solo lugar",
];

export function BookingSection() {
  return (
    <section
      id={BOOKING_SECTION_ID}
      aria-labelledby="agendar-title"
      className="scroll-mt-header-bar"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-22 sm:px-6 sm:py-26 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[calc(var(--spacing-header-bar)+1.5rem)] lg:flex-[1_1_20rem]">
          <SectionHeading id="agendar-title" title="Elige tu cita. Confirma con tu cuenta.">
            Empieza con el nombre y la especie de tu mascota, elige el tipo de cita, el profesional
            y la fecha con hora. Inicia sesión o crea tu cuenta para revisar y confirmar.
          </SectionHeading>
          <ul className="flex flex-col gap-3 pt-2">
            {BOOKING_PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-[15px] text-ink">
                <span className="flex size-7 flex-none items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <Icon name="check" width={16} height={16} />
                </span>
                {perk}
              </li>
            ))}
          </ul>
          <p className="mt-2 rounded-chip border border-danger-border bg-danger-bg p-4 text-[15px] leading-normal text-danger">
            <strong className="font-semibold">¿Es una urgencia?</strong> No esperes una cita: llama
            al{" "}
            <a
              href={emergencyPhoneUrl}
              className="font-semibold whitespace-nowrap underline underline-offset-[3px]"
            >
              {CLINIC.emergencyPhone}
            </a>
            .
          </p>
        </div>
        <div className="min-w-0 lg:flex lg:flex-[1.4_1_32.5rem] lg:flex-col lg:self-stretch">
          <LandingBookingForm />
        </div>
      </div>
    </section>
  );
}
