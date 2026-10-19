"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-provider";
import { useAuthDialog } from "@/features/auth/components/auth-dialog";
import { homeRouteFor } from "@/features/auth/redirects";
import { SectionHeading } from "@/features/landing/components/section-heading";

const PORTAL_FEATURES: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "calendar",
    title: "Mis citas",
    description: "Tus próximas citas y las pasadas. Reprograma o cancela sin llamar.",
  },
  {
    icon: "file-medical",
    title: "Historial clínico",
    description:
      "Consultas, vacunas, medicaciones, cirugías, estética y laboratorio, con aviso de las vacunas por vencer.",
  },
  {
    icon: "receipt",
    title: "Facturas",
    description: "Tus facturas pagadas con el detalle de cada servicio.",
  },
];

export function PortalSection() {
  const { user, status } = useAuth();
  const { open } = useAuthDialog();

  return (
    <section id="portal" aria-labelledby="portal-title" className="scroll-mt-28">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center">
        <div className="flex flex-col items-start gap-6">
          <SectionHeading id="portal-title" title="Tu portal del cliente: todo sobre tu mascota">
            Al iniciar sesión entras a tu portal privado. Ahí gestionas tus citas, consultas el
            historial clínico y revisas tus facturas.
          </SectionHeading>
          {status !== "loading" &&
            (user ? (
              <Link
                href={homeRouteFor(user.role)}
                className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-600 px-5 font-medium text-white hover:bg-brand-700"
              >
                Ir a mi portal
                <Icon name="arrow-right" width={18} height={18} />
              </Link>
            ) : (
              <div className="flex flex-col gap-3 self-stretch sm:flex-row sm:self-start">
                <Button onClick={() => open(undefined, "login")}>Iniciar sesión</Button>
                <Button variant="secondary" onClick={() => open(undefined, "register")}>
                  Crear cuenta
                </Button>
              </div>
            ))}
        </div>
        <ul className="flex flex-col gap-3 rounded-card border border-line bg-surface p-6">
          {PORTAL_FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="flex gap-4 border-b border-divider pb-4 last:border-b-0 last:pb-0"
            >
              <span className="flex size-10 flex-none items-center justify-center rounded-chip bg-brand-100 text-brand-700">
                <Icon name={feature.icon} width={20} height={20} />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold text-ink">{feature.title}</h3>
                <p className="text-muted">{feature.description}</p>
              </div>
            </li>
          ))}
          <li className="flex items-center gap-3 rounded-control bg-info-bg p-3 text-sm text-info">
            <Icon name="shield" width={20} height={20} className="flex-none" />
            La información clínica solo la ven tú y nuestro equipo.
          </li>
        </ul>
      </div>
    </section>
  );
}
