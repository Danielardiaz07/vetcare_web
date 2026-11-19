import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-3 rounded-card border border-sand-border bg-sand px-4 py-8 text-center [overflow-wrap:anywhere] sm:px-6 sm:py-10">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="max-w-prose text-muted">{description}</p>
      {action && <div className="mt-2 max-w-full">{action}</div>}
    </div>
  );
}
