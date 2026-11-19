"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-provider";
import { useAuthDialog } from "@/features/auth/components/auth-dialog";
import { homeRouteFor } from "@/features/auth/redirects";
import {
  CLINIC,
  emergencyPhoneUrl,
  HOURS_SUMMARY,
  LANDING_NAV,
  LANDING_SECTION_IDS,
  whatsappUrl,
} from "@/features/landing/content";
import { useActiveSection } from "@/features/landing/use-active-section";
import { ROUTES } from "@/lib/constants";

const SESSION_ACTION_CLASS =
  "inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-control px-2 font-medium whitespace-nowrap text-brand-600 transition-[background-color,transform] duration-150 ease-out hover:bg-brand-50 active:scale-[0.97] motion-reduce:active:scale-100 sm:px-3";

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === ROUTES.home;
  const headerRef = useRef<HTMLElement>(null);
  const activeSection = useActiveSection(isHome ? LANDING_SECTION_IDS : [], headerRef);
  return (
    <header
      ref={headerRef}
      className="sticky -top-header-strip z-30 border-b border-line bg-surface"
    >
      <div className="h-header-strip border-b border-navy bg-navy text-[13px] text-white">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
          <p className="flex min-w-0 items-center gap-2">
            <Icon name="phone" width={16} height={16} className="flex-none" />
            <span className="truncate">
              Urgencias 24 h:{" "}
              <a
                href={emergencyPhoneUrl}
                className="font-semibold underline-offset-2 hover:underline"
              >
                {CLINIC.emergencyPhone}
              </a>
            </span>
          </p>
          <div className="flex flex-none items-center gap-4">
            <span className="hidden lg:inline">Atención con cita de {HOURS_SUMMARY}</span>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`WhatsApp ${CLINIC.whatsappPhone}`}
              className="inline-flex h-full min-w-11 items-center justify-center gap-2 font-semibold underline-offset-2 hover:underline"
            >
              <Icon name="message-circle" width={16} height={16} />
              <span className="hidden sm:inline">WhatsApp {CLINIC.whatsappPhone}</span>
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto flex h-header-bar w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <Link
          href={ROUTES.home}
          className="flex flex-none items-center gap-2 text-2xl font-semibold tracking-[-0.02em] text-brand-600 sm:gap-3"
        >
          <Image src="/logo.png" alt="" width={44} height={44} priority />
          VetCare
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 lg:flex">
          {LANDING_NAV.map((item) => {
            const current =
              isHome && item.sectionId !== undefined && item.sectionId === activeSection;
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={current ? "location" : undefined}
                className="border-b-2 border-transparent pt-3 pb-2 text-[15px] font-semibold text-muted transition-colors duration-150 ease-out hover:text-brand-600 aria-[current=location]:border-brand-600 aria-[current=location]:text-brand-700"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <SessionActions />
      </div>
    </header>
  );
}

function SessionActions() {
  const { user, status, signOut } = useAuth();
  const { open } = useAuthDialog();

  if (status === "loading") return <span className="h-11" aria-hidden="true" />;

  if (!user) {
    return (
      <button type="button" onClick={() => open()} className={SESSION_ACTION_CLASS}>
        <Icon name="user" width={18} height={18} className="hidden sm:block" />
        Iniciar sesión
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link href={homeRouteFor(user.role)} className={SESSION_ACTION_CLASS}>
        <Icon name="user" width={18} height={18} className="hidden sm:block" />
        Mi portal
      </Link>
      <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line" />
      <button
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={() => void signOut()}
        className={`${SESSION_ACTION_CLASS} size-11 px-0!`}
      >
        <Icon name="log-out" width={18} height={18} />
      </button>
    </div>
  );
}
