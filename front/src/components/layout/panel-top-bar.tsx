"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { ChangePasswordDialog } from "@/features/auth/components/change-password-dialog";
import { ROUTES } from "@/lib/constants";
import { isStaffRole, ROLE_LABELS } from "@/lib/panel-menu";

type PanelTopBarProps = {
  onSignOut: () => void;
};

export function PanelTopBar({ onSignOut }: PanelTopBarProps) {
  const { user } = useAuth();
  const { show } = useToast();
  const [changingPassword, setChangingPassword] = useState(false);
  const roleLabel = user && isStaffRole(user.role) ? ROLE_LABELS[user.role] : "";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6">
        <Link
          href={ROUTES.home}
          className="flex items-center gap-2 text-lg font-semibold text-brand-700"
        >
          <Image src="/logo.png" alt="" width={44} height={44} priority />
          {/* A 360 px no cabe junto al rol y los botones; el logo basta y el nombre queda para lectores. */}
          <span className="sr-only sm:not-sr-only">VetCare</span>
          <span className="hidden border-l border-line pl-3 text-sm font-medium text-muted sm:inline">
            Panel interno
          </span>
        </Link>
        <div className="flex items-center gap-1 text-sm sm:gap-2">
          {/* D-32: el personal cambia su propia contraseña; el administrador nunca la ve. */}
          <button
            type="button"
            onClick={() => setChangingPassword(true)}
            title="Cambiar contraseña"
            className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 font-medium text-ink hover:bg-canvas sm:px-3"
          >
            <Icon name="user" className="size-5 text-brand-600" />
            <span className="sr-only">Cambiar contraseña de</span>
            <span className="hidden max-w-56 truncate sm:inline">{user?.email}</span>
            <span className="rounded-chip bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
              {roleLabel}
            </span>
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="min-h-11 rounded-control px-2 font-medium whitespace-nowrap text-muted hover:bg-canvas hover:text-ink sm:px-3"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
      <ChangePasswordDialog
        open={changingPassword}
        onClose={() => setChangingPassword(false)}
        onChanged={() => {
          setChangingPassword(false);
          show("Contraseña actualizada", "success");
        }}
      />
    </header>
  );
}
