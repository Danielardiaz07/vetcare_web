import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { BOOKABLE_SERVICES, bookingHref } from "@/features/landing/content";

export function Hero() {
  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="mx-auto flex w-full max-w-6xl scroll-mt-28 flex-col gap-6 px-4 pt-8 pb-12 sm:px-6 sm:pt-12"
    >
      <div className="flex max-w-3xl flex-col gap-3">
        <h1
          id="hero-title"
          className="text-4xl font-semibold tracking-tight text-balance text-ink sm:text-5xl"
        >
          Tu mascota en las mejores manos
        </h1>
        <p className="text-lg text-pretty text-muted">
          Atención médica de confianza, citas en línea y el historial clínico de tu mascota siempre
          a la mano.
        </p>
      </div>

      <nav
        aria-label="Agendar por servicio"
        className="flex flex-col gap-3 rounded-card border border-line bg-surface p-3 md:flex-row md:items-center"
      >
        <span className="px-2 font-semibold text-ink">¿Qué necesita tu mascota?</span>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 md:mx-0 md:flex-wrap md:px-0">
          {BOOKABLE_SERVICES.map((service) => (
            <Link
              key={service.shortName}
              href={bookingHref(service.appointmentType)}
              className="inline-flex min-h-11 flex-none items-center rounded-control border border-line bg-canvas px-4 font-medium whitespace-nowrap text-ink transition-colors duration-150 ease-out hover:border-brand-200 hover:bg-brand-50"
            >
              {service.shortName}
            </Link>
          ))}
        </div>
        <Link
          href={bookingHref()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand-600 px-6 font-semibold text-white transition-colors duration-150 ease-out hover:bg-brand-700 md:ml-auto"
        >
          <Icon name="calendar-plus" width={20} height={20} />
          Agendar cita
        </Link>
      </nav>

      <figure className="relative aspect-[4/3] overflow-hidden rounded-block bg-sand sm:aspect-[16/7]">
        <Image
          src="/hero.jpg"
          alt="Una veterinaria examina con el estetoscopio a un golden retriever sentado en la camilla"
          fill
          priority
          sizes="(min-width: 1152px) 1104px, 100vw"
          className="object-cover"
        />
      </figure>
    </section>
  );
}
