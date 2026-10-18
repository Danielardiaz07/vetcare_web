"use client";

import { useAuthDialog } from "@/features/auth/components/auth-dialog";

export function LoginButton() {
  const { open } = useAuthDialog();

  return (
    <button type="button" onClick={() => open()} className="min-h-11 text-muted hover:text-ink">
      Iniciar sesión
    </button>
  );
}
