"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import type { StatusTone } from "./status-badge";

type ToastTone = Exclude<StatusTone, "neutral">;

export type ToastAction = {
  label: string;
  onClick: () => void;
};

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
  actions: ToastAction[];
};

type ToastContextValue = {
  show: (message: string, tone?: ToastTone, actions?: ToastAction[]) => void;
};

const TOAST_DURATION_MS = 4000;
// Un aviso con botones dura más para que alcance a leerse y usarse.
const ACTION_TOAST_DURATION_MS = 10000;

const TONE_CLASSES: Record<ToastTone, string> = {
  success: "border-success-border bg-success-bg text-success",
  warning: "border-warning-border bg-warning-bg text-warning",
  danger: "border-danger-border bg-danger-bg text-danger",
  info: "border-info-border bg-info-bg text-info",
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info", actions: ToastAction[] = []) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, tone, actions }]);
      setTimeout(
        () => dismiss(id),
        actions.length > 0 ? ACTION_TOAST_DURATION_MS : TOAST_DURATION_MS,
      );
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex flex-col gap-2 rounded-control border px-4 py-3 text-sm font-medium shadow-sm ${TONE_CLASSES[toast.tone]}`}
          >
            <p>{toast.message}</p>
            {toast.actions.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {toast.actions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => {
                      dismiss(toast.id);
                      action.onClick();
                    }}
                    className="min-h-11 font-semibold underline underline-offset-2"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}
