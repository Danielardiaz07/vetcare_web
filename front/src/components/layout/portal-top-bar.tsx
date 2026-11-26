"use client";

import Link from "next/link";
import { PortalSideMenu } from "@/components/layout/portal-side-menu";
import { SectionHeaderBrand } from "@/components/layout/section-header-brand";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-provider";
import { AlertsBell } from "@/features/alerts/components/alerts-bell";
import { ROUTES } from "@/lib/constants";

type PortalTopBarProps = {
  onSignOut: () => void;
};

export function PortalTopBar({ onSignOut }: PortalTopBarProps) {
  const { user, profile } = useAuth();
  const owner = profile?.owner;
  const displayName = owner ? `${owner.firstNames} ${owner.lastNames}` : (user?.email ?? "");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <SectionHeaderBrand label="Portal del cliente" />
        <div className="flex min-w-0 items-center gap-1 text-sm sm:gap-2">
          <PortalSideMenu />
          {user && <AlertsBell key={user.id} userId={user.id} />}
          <Link
            href={ROUTES.portalProfile}
            aria-label={`Mi perfil: ${displayName}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 font-medium text-ink hover:bg-canvas"
          >
            <Icon name="user" className="size-5 text-brand-600" />
            <span className="hidden max-w-48 truncate sm:inline">{displayName}</span>
          </Link>
          <span aria-hidden="true" className="h-6 w-px shrink-0 bg-line" />
          <button
            type="button"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            onClick={onSignOut}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-brand-600 transition-colors duration-150 ease-out hover:bg-brand-50"
          >
            <Icon name="log-out" className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
