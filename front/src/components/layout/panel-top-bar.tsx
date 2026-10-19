"use client";

import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-provider";
import { ROUTES } from "@/lib/constants";
import { isStaffRole, ROLE_LABELS } from "@/lib/panel-menu";

type PanelTopBarProps = {
  onSignOut: () => void;
};

export function PanelTopBar({ onSignOut }: PanelTopBarProps) {
  const { user } = useAuth();
  const roleLabel = user && isStaffRole(user.role) ? ROLE_LABELS[user.role] : "";

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
            Panel interno
          </span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <p className="flex min-h-11 items-center gap-2 sm:px-3">
            <Icon name="user" className="hidden size-5 text-brand-600 sm:block" />
            <span className="hidden max-w-56 truncate font-medium text-ink sm:inline">
              {user?.email}
            </span>
            <span className="rounded-chip bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {roleLabel}
            </span>
          </p>
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-11 rounded-control px-3 font-medium whitespace-nowrap text-muted hover:bg-canvas hover:text-ink"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
