import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { LANDING_SERVICES, bookingHref, sectionHref } from "@/features/landing/content";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { durationLabel } from "@/features/staff/labels";

export function ServicesSection() {
  return (
    <section id="servicios" aria-labelledby="servicios-title" className="scroll-mt-28 bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6">
        <SectionHeading id="servicios-title" title="Atención médica, prevención y estética">
          Agenda en línea la consulta, la vacunación, el control o la estética. Cirugía y
          laboratorio se programan con la clínica.
        </SectionHeading>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_SERVICES.map((service) => (
            <li
              key={service.name}
              className="flex flex-col gap-4 rounded-card border border-line bg-canvas p-6"
            >
              <span className="flex size-11 items-center justify-center rounded-chip bg-brand-100 text-brand-700">
                <Icon name={service.icon} />
              </span>
              <div className="flex flex-1 flex-col gap-2">
                <h3 className="text-lg font-semibold text-ink">{service.name}</h3>
                <p className="text-muted">{service.description}</p>
                <p className="text-sm text-subtle">
                  {service.durationMinutes
                    ? `Duración aprox. ${durationLabel(service.durationMinutes)}`
                    : "Duración según el caso"}{" "}
                  · <strong className="font-semibold text-ink">{service.price}</strong>
                </p>
              </div>
              <Link
                href={
                  service.appointmentType
                    ? bookingHref(service.appointmentType)
                    : sectionHref("contacto")
                }
                className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-brand-700 hover:underline"
              >
                {service.appointmentType ? "Agendar" : "Consultar con la clínica"}
                <Icon name="arrow-right" width={18} height={18} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
