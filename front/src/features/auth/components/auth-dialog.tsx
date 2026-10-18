"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { LoginForm } from "@/features/auth/components/login-form";
import { homeRouteFor } from "@/features/auth/redirects";
import type { SessionUser } from "@/types/auth";

export type AuthTab = "login" | "register";

type AuthDialogContextValue = {
  open: (reason?: string, tab?: AuthTab) => void;
  close: () => void;
};

const DEFAULT_REASON = "Entra a tu portal: citas, historial clínico de tus mascotas y facturas.";

const TABS: { value: AuthTab; label: string }[] = [
  { value: "login", label: "Iniciar sesión" },
  { value: "register", label: "Crear cuenta" },
];

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

type AuthDialogProps = {
  open: boolean;
  reason: string;
  tab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
  onClose: () => void;
};

export function AuthDialog({ open, reason, tab, onTabChange, onClose }: AuthDialogProps) {
  const router = useRouter();
  const { show } = useToast();

  function handleLogin(user: SessionUser) {
    onClose();
    show("Sesión iniciada", "success", [
      { label: "Ir a mi portal", onClick: () => router.push(homeRouteFor(user.role)) },
      { label: "Seguir en la página", onClick: () => undefined },
    ]);
  }

  return (
    <Modal
      open={open}
      title={tab === "login" ? "Inicia sesión" : "Crea tu cuenta"}
      onClose={onClose}
    >
      <p className="-mt-2 text-sm text-muted">{reason}</p>
      <div
        role="group"
        aria-label="Tipo de acceso"
        className="grid grid-cols-2 gap-1 rounded-control bg-canvas p-1"
      >
        {TABS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => onTabChange(value)}
            className={`min-h-11 rounded-control font-semibold transition-colors duration-150 ease-out ${
              tab === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {open && tab === "login" && <LoginForm onSuccess={handleLogin} />}
    </Modal>
  );
}

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({
    open: false,
    reason: DEFAULT_REASON,
    tab: "login" as AuthTab,
  });

  const open = useCallback((reason: string = DEFAULT_REASON, tab: AuthTab = "login") => {
    setState({ open: true, reason, tab });
  }, []);

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false }));
  }, []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      <AuthDialog
        open={state.open}
        reason={state.reason}
        tab={state.tab}
        onTabChange={(tab) => setState((current) => ({ ...current, tab }))}
        onClose={close}
      />
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog(): AuthDialogContextValue {
  const context = useContext(AuthDialogContext);
  if (!context) {
    throw new Error("useAuthDialog debe usarse dentro de AuthDialogProvider");
  }
  return context;
}
