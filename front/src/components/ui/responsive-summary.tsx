"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

type ResponsiveSummaryProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function ResponsiveSummary({ title, description, children }: ResponsiveSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  return (
    <aside className="flex flex-col gap-4">
      <div className="rounded-card border border-line bg-surface px-5 pt-4 pb-2 lg:hidden">
        <h2 className="break-words text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((current) => !current)}
          className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-medium text-brand-700"
        >
          {expanded ? "Ocultar datos y antecedentes" : "Ver datos y antecedentes"}
          <Icon
            name="chevron-right"
            className={cn("size-4 shrink-0", expanded ? "-rotate-90" : "rotate-90")}
          />
        </button>
      </div>
      <div id={detailsId} className={cn("flex-col gap-4 lg:flex", expanded ? "flex" : "hidden")}>
        {children}
      </div>
    </aside>
  );
}
