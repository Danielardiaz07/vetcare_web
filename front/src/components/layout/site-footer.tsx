import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { CLINIC, bookingHref, sectionHref } from "@/features/landing/content";
import { ROUTES } from "@/lib/constants";

const ACCESS_LINKS = [
  { label: "Servicios", href: sectionHref("servicios") },
  { label: "Agendar cita", href: bookingHref() },
  { label: "Ubicación", href: sectionHref("ubicacion") },
  { label: "Portal del cliente", href: ROUTES.portal },
  { label: "Tratamiento de datos", href: ROUTES.dataPolicy },
];

export function SiteFooter() {
  return (
    <footer id="contacto" className="scroll-mt-28 bg-navy text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <span className="text-lg font-semibold">VetCare</span>
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
            <p className="text-white/75">
              Urgencias: {CLINIC.emergencyHours} · {CLINIC.emergencyPhone}
            </p>
          </div>
          <nav aria-label="Accesos" className="flex flex-col gap-1">
            <h2 className="font-semibold">Accesos</h2>
            {ACCESS_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="py-1 text-white/75 underline-offset-2 hover:text-white hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <p
          id="tratamiento-de-datos"
          className="scroll-mt-28 border-t border-white/15 pt-6 text-sm text-white/75"
        >
          Tratamos tus datos personales y los de tus mascotas según la Ley 1581 de 2012 y el Decreto
          1377 de 2013. Puedes consultarlos, actualizarlos o pedir que los eliminemos escribiendo a{" "}
          {CLINIC.email}. Política completa: {CLINIC.dataPolicyUrl}.
        </p>
        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} VetCare. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
