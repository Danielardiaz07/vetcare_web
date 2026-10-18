"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/components/ui/cn";
import { Icon, type IconName } from "@/components/ui/icon";
import { ROUTES } from "@/lib/constants";
import { getMyAppointments } from "@/services/appointments";

type MenuItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: IconName;
  inBottomBar: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { href: ROUTES.portal, label: "Inicio", shortLabel: "Inicio", icon: "home", inBottomBar: true },
  {
    href: ROUTES.portalAppointments,
    label: "Mis citas",
    shortLabel: "Citas",
    icon: "calendar",
    inBottomBar: true,
  },
  {
    href: ROUTES.portalNewAppointment,
    label: "Agendar",
    shortLabel: "Agendar",
    icon: "calendar-plus",
    inBottomBar: true,
  },
  {
    href: ROUTES.portalHistory,
    label: "Historial clínico",
    shortLabel: "Historial",
    icon: "file-medical",
    inBottomBar: true,
  },
  {
    href: ROUTES.portalInvoices,
    label: "Facturas",
    shortLabel: "Facturas",
    icon: "receipt",
    inBottomBar: true,
  },
  {
    href: ROUTES.portalProfile,
    label: "Mi perfil",
    shortLabel: "Perfil",
    icon: "user",
    inBottomBar: false,
  },
];

// Gana la ruta más larga que coincide: /portal/appointments/new es "Agendar", no "Mis citas".
function activeHref(pathname: string): string | undefined {
  return MENU_ITEMS.map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

function UpcomingCount({ count, compact = false }: { count: number; compact?: boolean }) {
  if (count === 0) return null;
  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white",
          compact ? "absolute -top-1 left-1/2 ml-2" : "ml-auto h-5",
        )}
      >
        {count}
      </span>
      <span className="sr-only">, {count === 1 ? "1 próxima" : `${count} próximas`}</span>
    </>
  );
}

export function PortalSideMenu() {
  const pathname = usePathname();
  const current = activeHref(pathname);
  const isNewAppointment = current === ROUTES.portalNewAppointment;
  const [upcoming, setUpcoming] = useState(0);

  // Se vuelve a contar al cambiar de página, para reflejar las citas que se agendan o cancelan.
  useEffect(() => {
    let active = true;
    getMyAppointments("upcoming", 1, 1)
      .then((result) => {
        if (active) setUpcoming(result.meta.total);
      })
      .catch(() => {
        if (active) setUpcoming(0);
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  const countFor = (href: string, compact?: boolean) =>
    href === ROUTES.portalAppointments ? (
      <UpcomingCount count={upcoming} compact={compact} />
    ) : null;

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col gap-4 self-start md:sticky md:top-24 md:flex">
        <nav aria-label="Portal">
          <ul className="flex flex-col gap-1">
            {MENU_ITEMS.map(({ href, label, icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={href === current ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-control px-3 font-medium transition-colors duration-150 ease-out",
                    href === current
                      ? "bg-brand-50 text-brand-700"
                      : "text-muted hover:bg-canvas hover:text-ink",
                  )}
                >
                  <Icon name={icon} className="size-5" />
                  {label}
                  {countFor(href)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          href={ROUTES.portalNewAppointment}
          aria-current={isNewAppointment ? "page" : undefined}
          className={cn(
            "flex min-h-11 items-center justify-center gap-2 rounded-control bg-brand-600 px-4 font-semibold text-white transition-colors duration-150 ease-out hover:bg-brand-700",
            isNewAppointment && "pointer-events-none opacity-75",
          )}
        >
          <Icon name="calendar-plus" className="size-5" />
          Agendar cita
        </Link>
      </aside>
      <nav
        aria-label="Portal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {MENU_ITEMS.filter((item) => item.inBottomBar).map(({ href, shortLabel, icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={href === current ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                  href === current ? "text-brand-700" : "text-muted",
                )}
              >
                <Icon name={icon} className="size-5" />
                {shortLabel}
                {countFor(href, true)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
