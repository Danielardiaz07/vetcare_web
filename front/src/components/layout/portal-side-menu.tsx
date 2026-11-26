"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SectionMenu } from "@/components/layout/section-menu";
import type { IconName } from "@/components/ui/icon";
import { ROUTES } from "@/lib/constants";
import { APPOINTMENTS_CHANGED_EVENT, getMyAppointments } from "@/services/appointments";

type MenuItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: IconName;
  hideOnMobile?: boolean;
  primary?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { href: ROUTES.portal, label: "Inicio", shortLabel: "Inicio", icon: "home" },
  {
    href: ROUTES.portalAppointments,
    label: "Mis citas",
    shortLabel: "Citas",
    icon: "calendar",
  },
  {
    href: ROUTES.portalNewAppointment,
    label: "Agendar cita",
    shortLabel: "Agendar",
    icon: "calendar-plus",
    primary: true,
  },
  {
    href: ROUTES.portalHistory,
    label: "Historial clínico",
    shortLabel: "Historial",
    icon: "file-medical",
  },
  {
    href: ROUTES.portalInvoices,
    label: "Facturas",
    shortLabel: "Facturas",
    icon: "receipt",
  },
  {
    href: ROUTES.portalProfile,
    label: "Mi perfil",
    shortLabel: "Perfil",
    icon: "user",
    hideOnMobile: true,
  },
];

function activeHref(pathname: string): string | undefined {
  return MENU_ITEMS.map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}

export function PortalSideMenu() {
  const pathname = usePathname();
  const current = activeHref(pathname);
  const [upcoming, setUpcoming] = useState(0);

  useEffect(() => {
    let active = true;
    const count = () =>
      getMyAppointments("upcoming", 1, 1)
        .then((result) => {
          if (active) setUpcoming(result.meta.total);
        })
        .catch(() => {
          if (active) setUpcoming(0);
        });
    void count();
    window.addEventListener(APPOINTMENTS_CHANGED_EVENT, count);
    return () => {
      active = false;
      window.removeEventListener(APPOINTMENTS_CHANGED_EVENT, count);
    };
  }, [pathname]);

  return (
    <SectionMenu
      label="Portal"
      current={current}
      items={MENU_ITEMS.map((item) =>
        item.href === ROUTES.portalAppointments ? { ...item, upcoming } : item,
      )}
    />
  );
}
