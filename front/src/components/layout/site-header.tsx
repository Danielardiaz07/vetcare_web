"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/cn";
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
  "inline-flex items-center justify-center gap-2 rounded-control px-3 font-medium text-brand-600 transition-[background-color,transform] duration-150 ease-out hover:bg-brand-50 active:scale-[0.97] motion-reduce:active:scale-100";

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === ROUTES.home;
  const headerRef = useRef<HTMLElement>(null);
  const activeSection = useActiveSection(isHome ? LANDING_SECTION_IDS : [], headerRef);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const navLinks = (className: string) =>
    LANDING_NAV.map((item) => {
      const current = isHome && item.sectionId !== undefined && item.sectionId === activeSection;
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={closeMenu}
          aria-current={current ? "location" : undefined}
          className={className}
        >
          {item.label}
        </Link>
      );
    });

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
      <div className="mx-auto flex h-header-bar w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={ROUTES.home}
          className="flex flex-none items-center gap-3 text-2xl font-semibold tracking-[-0.02em] text-brand-600"
        >
          <Image src="/logo.png" alt="" width={44} height={44} priority />
          VetCare
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-6 lg:flex">
          {navLinks(
            "border-b-2 border-transparent pt-3 pb-2 text-[15px] font-semibold text-muted transition-colors duration-150 ease-out hover:text-brand-600 aria-[current=location]:border-brand-600 aria-[current=location]:text-brand-700",
          )}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex">
            <SessionActions layout="bar" />
          </div>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-11 items-center justify-center rounded-control border-[1.5px] border-line bg-surface text-ink hover:bg-brand-50 lg:hidden"
          >
            <Icon name={menuOpen ? "close" : "menu"} width={20} height={20} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div
          id="menu-movil"
          className="border-t border-line transition-[opacity,translate] duration-200 ease-out starting:-translate-y-1.5 starting:opacity-0 motion-reduce:starting:translate-y-0 lg:hidden"
        >
          <nav
            aria-label="Principal"
            className="mx-auto flex max-w-6xl flex-col px-4 pt-2 text-lg font-semibold sm:px-6"
          >
            {navLinks(
              "flex min-h-12 items-center border-b border-divider text-ink hover:text-brand-600 aria-[current=location]:text-brand-700",
            )}
          </nav>
          <div className="mx-auto flex max-w-6xl flex-col px-4 pt-4 pb-5 sm:hidden">
            <SessionActions layout="menu" onAction={closeMenu} />
          </div>
        </div>
      )}
    </header>
  );
}

type SessionActionsProps = {
  layout: "bar" | "menu";
  onAction?: () => void;
};

function SessionActions({ layout, onAction }: SessionActionsProps) {
  const { user, status, signOut } = useAuth();
  const { open } = useAuthDialog();
  const inMenu = layout === "menu";

  if (status === "loading") return <span className="h-11" aria-hidden="true" />;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => {
          onAction?.();
          open();
        }}
        className={cn(SESSION_ACTION_CLASS, inMenu ? "min-h-12 w-full" : "min-h-11")}
      >
        <Icon name="user" width={18} height={18} />
        Iniciar sesión
      </button>
    );
  }

  return (
    <div className={cn("flex items-center gap-1", inMenu && "w-full flex-col items-stretch gap-2")}>
      <Link
        href={homeRouteFor(user.role)}
        onClick={onAction}
        className={cn(SESSION_ACTION_CLASS, inMenu ? "min-h-12 w-full" : "min-h-11")}
      >
        <Icon name="user" width={18} height={18} />
        Mi portal
      </Link>
      <span
        aria-hidden="true"
        className={cn("shrink-0 bg-line", inMenu ? "h-px w-full" : "h-6 w-px")}
      />
      <button
        type="button"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        onClick={() => {
          onAction?.();
          void signOut();
        }}
        className={cn(SESSION_ACTION_CLASS, inMenu ? "min-h-12 w-full" : "size-11 px-0!")}
      >
        <Icon name="log-out" width={18} height={18} />
        <span className={inMenu ? undefined : "sr-only"}>Cerrar sesión</span>
      </button>
    </div>
  );
}
