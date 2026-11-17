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

// En móvil la foto es un cuadro de 96 px junto al nombre; desde sm, un cuadrado de hasta 260 px.
const PHOTO_CLASS =
  "relative size-24 flex-none overflow-hidden rounded-card sm:aspect-square sm:size-auto sm:w-full";

function MemberPhoto({ member }: { member: TeamMember }) {
  if (member.photo) {
    return (
      <div className={`${PHOTO_CLASS} border border-line`}>
        <Image
          src={member.photo}
          alt={`Foto de ${member.name}`}
          fill
          sizes="(min-width: 640px) 260px, 96px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${PHOTO_CLASS} flex items-center justify-center border border-dashed border-sand-border bg-sand text-2xl font-semibold text-honey sm:text-4xl`}
    >
      {initialsOf(member.name)}
    </div>
  );
}

// D-45: tarjetas pequeñas y cuadradas; con dos o tres personas no se estiran a todo el ancho.
export function TeamSection() {
  return (
    <section id="equipo" aria-labelledby="equipo-title" className="scroll-mt-header-bar">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-14 sm:px-6 sm:py-16">
        <SectionHeading id="equipo-title" title="Médicos veterinarios que conocen a tu mascota.">
          Todo nuestro equipo tiene tarjeta profesional vigente. Al agendar ves quién atenderá a tu
          mascota.
        </SectionHeading>
        <ul className="grid sm:grid-cols-[repeat(3,minmax(0,16.25rem))] sm:gap-10">
          {LANDING_TEAM.map((member) => (
            <li
              key={member.name}
              className="flex items-center gap-5 border-t border-line py-5 last:border-b sm:flex-col sm:items-stretch sm:gap-3.5 sm:border-0 sm:py-0 sm:last:border-b-0"
            >
              <MemberPhoto member={member} />
              <div>
                <h3 className="text-lg font-semibold text-ink">{member.name}</h3>
                <p className="text-[15px] text-muted">{member.specialty}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
