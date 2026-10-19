import { SectionHeading } from "@/features/landing/components/section-heading";
import { TEAM_PLACEHOLDERS } from "@/features/landing/content";

export function TeamSection() {
  return (
    <section id="equipo" aria-labelledby="equipo-title" className="scroll-mt-28 bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6">
        <SectionHeading id="equipo-title" title="Médicos veterinarios que conocen a tu mascota">
          Todo nuestro equipo tiene tarjeta profesional vigente. Al agendar ves quién atenderá a tu
          mascota.
        </SectionHeading>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: TEAM_PLACEHOLDERS }, (_, index) => (
            <li key={index} className="flex flex-col gap-3">
              <div
                role="img"
                aria-label="Espacio para la foto del médico veterinario"
                className="flex aspect-[4/3] items-center justify-center rounded-card border border-sand-border bg-sand font-semibold text-honey"
              >
                [FOTO]
              </div>
              <div>
                <h3 className="font-semibold text-ink">[NOMBRE]</h3>
                <p className="text-muted">[ESPECIALIDAD]</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
