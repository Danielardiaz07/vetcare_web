import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { DataPolicyLink } from "@/features/landing/components/data-policy-link";
import { BOOKING_SECTION_ID, CLINIC, sectionHref } from "@/features/landing/content";
import { ROUTES } from "@/lib/constants";

const ACCESS_LINKS = [
  { label: "Servicios", href: sectionHref("servicios") },
  { label: "Agendar cita", href: sectionHref(BOOKING_SECTION_ID) },
  { label: "Ubicación", href: sectionHref("ubicacion") },
  { label: "Portal del cliente", href: ROUTES.portal },
];

const ACCESS_LINK_CLASS =
  "py-1 text-left text-white/75 underline-offset-2 hover:text-white hover:underline";

export function SiteFooter() {
  return (
    // pb-28: en móvil el botón flotante de VetBot no tapa la última línea.
    <footer id="contacto" className="scroll-mt-header-bar bg-navy text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pt-20 pb-28 sm:px-6 sm:pb-20">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <span className="text-lg font-semibold tracking-[-0.02em]">VetCare</span>
            <p className="text-white/75">
              Clínica veterinaria con atención presencial y herramientas digitales para el cuidado
              de tu mascota.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold">Contacto</h2>
            <p className="flex gap-2 text-white/75">
              <Icon name="map-pin" width={18} height={18} className="mt-0.5 flex-none" />
              {CLINIC.address}, {CLINIC.city}
            </p>
            <p className="flex gap-2 text-white/75">
              <Icon name="phone" width={18} height={18} className="mt-0.5 flex-none" />
              {CLINIC.phone}
            </p>
            <p className="text-white/75">{CLINIC.email}</p>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="font-semibold">Horario</h2>
            <p className="text-white/75">Lunes a viernes: {CLINIC.weekdayHours}</p>
            <p className="text-white/75">Sábados: {CLINIC.saturdayHours}</p>
            <p className="flex items-baseline gap-2 font-semibold text-white">
              <span
                aria-hidden="true"
                className="size-2 flex-none -translate-y-px rounded-full bg-danger-on-dark"
              />
              <span>
                Urgencias: {CLINIC.emergencyHours} · {CLINIC.emergencyPhone}
              </span>
            </p>
          </div>
          <nav aria-label="Accesos" className="flex flex-col gap-1">
            <h2 className="font-semibold">Accesos</h2>
            {ACCESS_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className={ACCESS_LINK_CLASS}>
                {link.label}
              </Link>
            ))}
            <DataPolicyLink className={ACCESS_LINK_CLASS}>Tratamiento de datos</DataPolicyLink>
          </nav>
        </div>
        <p className="border-t border-white/15 pt-6 text-sm text-white/75">
          Tratamos tus datos personales y los de tus mascotas según la Ley 1581 de 2012 y el Decreto
          1377 de 2013. Puedes consultarlos, actualizarlos o pedir que los eliminemos escribiendo a{" "}
          {CLINIC.email}.{" "}
          <DataPolicyLink className="font-semibold text-white underline underline-offset-2">
            Lee la política completa
          </DataPolicyLink>
          .
        </p>
        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} VetCare. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
