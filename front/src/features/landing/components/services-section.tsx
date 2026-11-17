import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { BookingTrigger } from "@/features/landing/components/booking-trigger";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { LANDING_SERVICES, sectionHref } from "@/features/landing/content";
import { durationLabel } from "@/features/staff/labels";

// La flecha se corre un poco al pasar el mouse (solo con puntero y sin "reducir movimiento").
const SERVICE_ACTION_CLASS =
  "group col-start-2 inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold text-brand-700 hover:underline sm:col-start-3";
const ARROW_CLASS =
  "transition-transform duration-200 ease-out group-hover:translate-x-[3px] motion-reduce:group-hover:translate-x-0";

// D-45: lista en dos columnas en lugar de tarjetas; se lee más rápido y deja respirar el texto.
export function ServicesSection() {
  return (
    <section
      id="servicios"
      aria-labelledby="servicios-title"
      className="scroll-mt-header-bar border-y border-line bg-surface"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-22 sm:px-6 sm:py-25 lg:py-16">
        <SectionHeading id="servicios-title" title="Atención médica, prevención y estética.">
          Agenda en línea la consulta, la vacunación, el control o la estética; el resumen te
          muestra la duración y el valor antes de confirmar. Cirugía y laboratorio se programan con
          la clínica.
        </SectionHeading>
        <ul className="grid gap-x-12 md:grid-cols-2">
          {LANDING_SERVICES.map((service) => (
            <li
              key={service.name}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 border-t border-line py-6 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto]"
            >
              <Icon
                name={service.icon}
                width={26}
                height={26}
                className="translate-y-1 self-start text-brand-600"
              />
              <div className="flex flex-col gap-1">
                <h3 className="text-lg font-semibold text-ink">{service.name}</h3>
                <p className="text-[15px] leading-relaxed text-muted">{service.description}</p>
                <p className="text-sm text-subtle">
                  {service.durationMinutes
                    ? `Duración aprox. ${durationLabel(service.durationMinutes)}`
                    : "Duración según el caso"}{" "}
                  · <strong className="font-semibold text-ink">{service.price}</strong>
                </p>
              </div>
              {service.appointmentType ? (
                <BookingTrigger type={service.appointmentType} className={SERVICE_ACTION_CLASS}>
                  Agendar
                  <Icon name="arrow-right" width={16} height={16} className={ARROW_CLASS} />
                </BookingTrigger>
              ) : (
                <Link href={sectionHref("contacto")} className={SERVICE_ACTION_CLASS}>
                  Contactar
                  <Icon name="arrow-right" width={16} height={16} className={ARROW_CLASS} />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
