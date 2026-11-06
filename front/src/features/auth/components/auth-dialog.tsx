"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { LoginForm } from "@/features/auth/components/login-form";
import { RegisterFlow } from "@/features/auth/components/register-flow";
import { homeRouteFor } from "@/features/auth/redirects";
import type { SessionUser } from "@/types/auth";

export type AuthTab = "login" | "register";

// Quien abre la ventana para seguir con una tarea (agendar desde la portada) se queda en la página.
export type SignedInHandler = (user: SessionUser) => void;

type AuthDialogContextValue = {
  isOpen: boolean;
  open: (reason?: string, tab?: AuthTab, onSignedIn?: SignedInHandler) => void;
  close: () => void;
};

const DEFAULT_REASON = "Entra a tu portal: citas, historial clínico de tus mascotas y facturas.";

const TABS: { value: AuthTab; label: string }[] = [
  { value: "login", label: "Iniciar sesión" },
  { value: "register", label: "Crear cuenta" },
];

type DialogState = {
  open: boolean;
  reason: string;
  tab: AuthTab;
  onSignedIn?: SignedInHandler;
};

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

type AuthDialogProps = {
  open: boolean;
  reason: string;
  tab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
  onClose: () => void;
  onSignedIn?: SignedInHandler;
};

export function AuthDialog({
  open,
  reason,
  tab,
  onTabChange,
  onClose,
  onSignedIn,
}: AuthDialogProps) {
  const router = useRouter();
  const { show } = useToast();

  function handleLogin(user: SessionUser) {
    onClose();
    if (onSignedIn) {
      onSignedIn(user);
      return;
    }
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
      {open && tab === "register" && (
        <RegisterFlow
          onGoToLogin={() => onTabChange("login")}
          onDone={onClose}
          onSignedIn={onSignedIn}
        />
      )}
    </Modal>
  );
}

export function AuthDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({
    open: false,
    reason: DEFAULT_REASON,
    tab: "login",
  });

  const open = useCallback(
    (reason: string = DEFAULT_REASON, tab: AuthTab = "login", onSignedIn?: SignedInHandler) => {
      setState({ open: true, reason, tab, onSignedIn });
    },
    [],
  );

  const close = useCallback(() => {
    setState((current) => ({ ...current, open: false, onSignedIn: undefined }));
  }, []);

  const value = useMemo(() => ({ isOpen: state.open, open, close }), [state.open, open, close]);

  return (
    <AuthDialogContext.Provider value={value}>
      {children}
      <AuthDialog
        open={state.open}
        reason={state.reason}
        tab={state.tab}
        onTabChange={(tab) => setState((current) => ({ ...current, tab }))}
        onClose={close}
        onSignedIn={state.onSignedIn}
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
