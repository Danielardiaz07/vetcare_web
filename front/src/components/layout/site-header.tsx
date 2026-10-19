"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-provider";
import { useAuthDialog } from "@/features/auth/components/auth-dialog";
import { homeRouteFor } from "@/features/auth/redirects";
import { CLINIC, LANDING_NAV } from "@/features/landing/content";
import { useActiveSection } from "@/features/landing/use-active-section";
import { ROUTES } from "@/lib/constants";

const SECTION_IDS = LANDING_NAV.flatMap((item) => (item.sectionId ? [item.sectionId] : []));

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === ROUTES.home;
  const activeSection = useActiveSection(isHome ? SECTION_IDS : []);
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
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="bg-navy text-sm text-white">
        <p className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
          <Icon name="phone" width={16} height={16} />
          <span>
            Urgencias 24 h:{" "}
            <a
              href={`tel:${CLINIC.emergencyPhone}`}
              className="font-semibold underline-offset-2 hover:underline"
            >
              {CLINIC.emergencyPhone}
            </a>
          </span>
        </p>
      </div>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href={ROUTES.home}
          className="flex items-center gap-2 text-lg font-semibold text-brand-700"
        >
          <Image src="/logo.png" alt="" width={44} height={44} priority />
          VetCare
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {navLinks(
            "rounded-control px-3 py-2 text-muted transition-colors duration-150 ease-out hover:text-ink aria-[current=location]:bg-brand-50 aria-[current=location]:font-semibold aria-[current=location]:text-brand-700",
          )}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex">
            <SessionActions />
          </div>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex size-11 items-center justify-center rounded-control text-ink hover:bg-brand-50 lg:hidden"
          >
            <Icon name={menuOpen ? "close" : "menu"} />
          </button>
        </div>
      </div>
      {menuOpen && (
        <div id="menu-movil" className="border-t border-line bg-surface lg:hidden">
          <nav aria-label="Principal" className="mx-auto flex max-w-6xl flex-col px-4 py-2 sm:px-6">
            {navLinks(
              "flex min-h-11 items-center border-b border-divider text-ink aria-[current=location]:font-semibold aria-[current=location]:text-brand-700",
            )}
          </nav>
          <div className="mx-auto flex max-w-6xl px-4 pb-4 sm:hidden">
            <SessionActions onAction={closeMenu} />
          </div>
        </div>
      )}
    </header>
  );
}

function SessionActions({ onAction }: { onAction?: () => void }) {
  const { user, status, signOut } = useAuth();
  const { open } = useAuthDialog();

  if (status === "loading") return <span className="h-11" aria-hidden="true" />;

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => {
          onAction?.();
          open();
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-control border border-field-border px-4 font-medium text-ink hover:bg-brand-50"
      >
        <Icon name="log-in" width={18} height={18} />
        Iniciar sesión
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={homeRouteFor(user.role)}
        onClick={onAction}
        className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand-600 px-4 font-medium text-white hover:bg-brand-700"
      >
        <Icon name="user" width={18} height={18} />
        Mi portal
      </Link>
      <button
        type="button"
        onClick={() => {
          onAction?.();
          void signOut();
        }}
        className="min-h-11 rounded-control px-3 font-medium text-muted hover:text-ink"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
