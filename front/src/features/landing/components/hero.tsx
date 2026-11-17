import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { BookingTrigger } from "@/features/landing/components/booking-trigger";
import { BOOKABLE_SERVICES } from "@/features/landing/content";

// D-45: el hero ocupa el alto visible menos el encabezado completo (--spacing-header) y la foto se
// estira para completarlo; en pantallas muy altas se limita a 980 px. Con scroll-mt-header, ir a
// "Inicio" deja la página arriba del todo, con la franja de urgencias a la vista.
export function Hero() {
  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="mx-auto flex min-h-[min(calc(100svh-var(--spacing-header)),61.25rem)] w-full max-w-6xl scroll-mt-header flex-col items-start gap-[clamp(0.75rem,2.2vh,1.5rem)] px-4 pt-[clamp(1rem,4vh,3rem)] pb-[clamp(1rem,3vh,2rem)] sm:px-6"
    >
      <div className="flex animate-fade-in flex-col items-start gap-[clamp(0.5rem,1.4vh,0.875rem)]">
        <h1
          id="hero-title"
          className="text-[clamp(2rem,min(5.4vw,8vh),4.25rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-ink"
        >
          Tu mascota en las mejores manos.
        </h1>
        <p className="text-[clamp(1.0625rem,1.4vw,1.125rem)] leading-relaxed text-muted">
          Atención médica de confianza, citas en línea y el historial clínico de tu mascota siempre
          a la mano.
        </p>
      </div>

      <nav
        aria-label="Agendar por servicio"
        className="flex w-full animate-fade-in flex-col gap-2.5 rounded-card border border-line bg-surface p-3 md:flex-row md:items-center"
      >
        <span className="px-1 text-[15px] font-semibold text-ink md:px-1.5 md:max-xl:hidden">
          ¿Qué necesita tu mascota?
        </span>
        {/* En móvil los servicios se deslizan; el borde derecho se difumina para insinuar que hay más. */}
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pr-8 [scrollbar-width:none] [mask-image:linear-gradient(90deg,#000_calc(100%-2rem),transparent)] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:[mask-image:none]">
          {BOOKABLE_SERVICES.map((service) => (
            <BookingTrigger
              key={service.shortName}
              type={service.appointmentType}
              className="inline-flex min-h-11 flex-none items-center rounded-control border border-line bg-canvas px-4 text-[15px] font-medium whitespace-nowrap text-ink transition-[background-color,border-color,transform] duration-150 ease-out hover:border-brand-200 hover:bg-brand-50 active:scale-[0.97] motion-reduce:active:scale-100"
            >
              {service.shortName}
            </BookingTrigger>
          ))}
        </div>
        <BookingTrigger className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-control bg-brand-600 px-6 font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-700 active:scale-[0.97] motion-reduce:active:scale-100 md:ml-auto">
          <Icon name="calendar-plus" width={20} height={20} />
          Agendar cita
        </BookingTrigger>
      </nav>

      <figure className="relative min-h-36 w-full flex-1 animate-fade-in-late">
        <Image
          src="/hero.jpg"
          alt="Una veterinaria examina con el estetoscopio a un golden retriever sentado en la camilla"
          fill
          priority
          sizes="(min-width: 1152px) 1104px, 100vw"
          className="rounded-card object-cover object-[68%_40%] md:object-[60%_35%]"
        />
      </figure>
    </section>
  );
}
