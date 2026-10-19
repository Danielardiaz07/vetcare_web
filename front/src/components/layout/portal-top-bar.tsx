"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-provider";
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
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href={ROUTES.home}
          className="flex items-center gap-2 text-lg font-semibold text-brand-700"
        >
          <Image src="/logo.png" alt="" width={44} height={44} priority />
          VetCare
          <span className="hidden border-l border-line pl-3 text-sm font-medium text-muted sm:inline">
            Portal del cliente
          </span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={ROUTES.portalProfile}
            aria-label={`Mi perfil: ${displayName}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 font-medium text-ink hover:bg-canvas"
          >
            <Icon name="user" className="size-5 text-brand-600" />
            <span className="hidden max-w-48 truncate sm:inline">{displayName}</span>
          </Link>
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-11 rounded-control px-3 font-medium text-muted hover:bg-canvas hover:text-ink"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
