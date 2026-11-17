"use client";

import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "./cn";
import { describedBy, FieldMessage } from "./field-message";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, id, className, children, ...props },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = `${selectId}-hint`;
  const errorId = `${selectId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hintId, errorId, hint, error)}
        className={cn(
          "min-h-11 rounded-control border bg-surface px-3 text-ink",
          error ? "border-danger" : "border-field-border",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <FieldMessage hintId={hintId} errorId={errorId} hint={hint} error={error} />
    </div>
  );
});
