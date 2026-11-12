import Image from "next/image";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { LANDING_TEAM, type TeamMember } from "@/features/landing/content";

const INITIALS_LENGTH = 2;

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter((word) => !word.endsWith("."))
    .slice(0, INITIALS_LENGTH)
    .map((word) => word.charAt(0))
    .join("");

function MemberPhoto({ member }: { member: TeamMember }) {
  if (member.photo) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-line">
        <Image
          src={member.photo}
          alt={`Foto de ${member.name}`}
          fill
          sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="flex aspect-[4/3] items-center justify-center rounded-card border border-sand-border bg-sand text-4xl font-semibold text-honey"
    >
      {initialsOf(member.name)}
    </div>
  );
}

export function TeamSection() {
  return (
    <section id="equipo" aria-labelledby="equipo-title" className="scroll-mt-28 bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6">
        <SectionHeading id="equipo-title" title="Médicos veterinarios que conocen a tu mascota">
          Todo nuestro equipo tiene tarjeta profesional vigente. Al agendar ves quién atenderá a tu
          mascota.
        </SectionHeading>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_TEAM.map((member) => (
            <li key={member.name} className="flex flex-col gap-3">
              <MemberPhoto member={member} />
              <div>
                <h3 className="font-semibold text-ink">{member.name}</h3>
                <p className="text-muted">{member.specialty}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
