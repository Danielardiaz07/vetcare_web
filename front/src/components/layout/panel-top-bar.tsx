"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SectionHeaderBrand } from "@/components/layout/section-header-brand";
import { SectionMenu } from "@/components/layout/section-menu";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/features/auth/auth-provider";
import { accountDisplayName } from "@/features/users/account";
import { ROUTES } from "@/lib/constants";
import { PANEL_MENU, panelItemFor, ROLE_LABELS, type StaffRole } from "@/lib/panel-menu";

type PanelTopBarProps = {
  role: StaffRole;
  onSignOut: () => void;
};

export function PanelTopBar({ role, onSignOut }: PanelTopBarProps) {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const displayName = accountDisplayName(profile, user?.email ?? "");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <SectionHeaderBrand label="Panel interno" hideWordmarkOnMobile />
        <div className="flex items-center gap-1 text-sm sm:gap-2">
          <SectionMenu
            label="Panel"
            items={PANEL_MENU[role]}
            current={panelItemFor(role, pathname)?.href}
          />
          <Link
            href={ROUTES.panelAccount}
            aria-current={pathname === ROUTES.panelAccount ? "page" : undefined}
            title="Mi cuenta"
            className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 font-medium text-ink hover:bg-canvas aria-[current=page]:bg-brand-50 sm:px-3"
          >
            <Icon name="user" className="size-5 text-brand-600" />
            <span className="sr-only">Mi cuenta:</span>
            <span className="hidden max-w-56 truncate sm:inline">{displayName}</span>
            <span className="rounded-chip bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {ROLE_LABELS[role]}
            </span>
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
