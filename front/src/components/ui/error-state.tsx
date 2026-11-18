"use client";

import { Button } from "./button";
import { Icon } from "./icon";

type ErrorStateProps = {
  onRetry: () => void;
};

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card border border-danger-border bg-danger-bg px-6 py-10 text-center"
    >
      <Icon name="alert" className="text-danger" />
      <h2 className="text-lg font-semibold text-ink">No pudimos cargar tus datos</h2>
      <p className="max-w-prose text-muted">Revisa tu conexión y vuelve a intentarlo.</p>
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
