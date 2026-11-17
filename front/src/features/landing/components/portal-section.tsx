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
      "Consultas, vacunas, cirugías, internaciones, exámenes y estética, con aviso de las vacunas por vencer.",
  },
  {
    icon: "receipt",
    title: "Facturas",
    description: "Tus facturas pagadas con el detalle de cada servicio, listas para imprimir.",
  },
];

// D-45: franja celeste para separar visualmente el portal del resto de la portada.
export function PortalSection() {
  const { user, status } = useAuth();
  const { open } = useAuthDialog();

  return (
    <section
      id="portal"
      aria-labelledby="portal-title"
      className="scroll-mt-header-bar border-y border-brand-200 bg-brand-50"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-20 sm:px-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-col items-start gap-6 lg:flex-[1_1_23.75rem]">
          <SectionHeading
            id="portal-title"
            title="Tu portal del cliente: todo sobre tu mascota, en un solo lugar."
          >
            Al iniciar sesión entras a tu portal privado. Ahí gestionas tus citas, consultas el
            historial clínico y revisas tus facturas.
          </SectionHeading>
          {status !== "loading" &&
            (user ? (
              <Link
                href={homeRouteFor(user.role)}
                className="group inline-flex min-h-12 items-center gap-3 rounded-control bg-brand-600 px-6 font-semibold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-brand-700 active:scale-[0.97] motion-reduce:active:scale-100"
              >
                Ir a mi portal
                <Icon
                  name="arrow-right"
                  width={18}
                  height={18}
                  className="transition-transform duration-200 ease-out group-hover:translate-x-[3px] motion-reduce:group-hover:translate-x-0"
                />
              </Link>
            ) : (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Button onClick={() => open(undefined, "login")}>Iniciar sesión</Button>
                <button
                  type="button"
                  onClick={() => open(undefined, "register")}
                  className="min-h-11 px-2 font-semibold text-brand-600 underline underline-offset-[3px] hover:text-brand-700"
                >
                  Crear cuenta
                </button>
              </div>
            ))}
        </div>
        <ul className="flex min-w-0 flex-col rounded-card bg-surface px-6 py-2 shadow-soft lg:flex-[1.2_1_27.5rem]">
          {PORTAL_FEATURES.map((feature) => (
            <li
              key={feature.title}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 border-b border-divider py-5"
            >
              <Icon name={feature.icon} className="mt-0.5 text-brand-600" />
              <div>
                <h3 className="text-lg font-semibold text-ink">{feature.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{feature.description}</p>
              </div>
            </li>
          ))}
          <li className="flex items-center gap-3 py-4 text-[15px] text-subtle">
            <Icon name="lock" width={16} height={16} className="flex-none" />
            La información clínica solo la ven tú y nuestro equipo.
          </li>
        </ul>
      </div>
    </section>
  );
}
