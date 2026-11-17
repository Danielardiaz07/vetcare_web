import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

type ChoiceButtonProps = {
  selected: boolean;
  onSelect: () => void;
  label: ReactNode;
  detail?: ReactNode;
  ariaLabel?: string;
  className?: string;
};

export function ChoiceButton({
  selected,
  onSelect,
  label,
  detail,
  ariaLabel,
  className,
}: ChoiceButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onSelect}
      className={cn(
        "flex min-h-11 flex-col items-start justify-center gap-0.5 rounded-control border px-4 py-2 text-left transition-colors duration-150 ease-out",
        selected
          ? "border-brand-600 bg-brand-50 text-brand-700"
          : "border-field-border bg-surface text-ink hover:bg-brand-50",
        className,
      )}
    >
      <span className="font-semibold">{label}</span>
      {detail && <span className="text-sm text-muted">{detail}</span>}
    </button>
  );
}
