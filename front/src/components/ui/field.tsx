"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "./cn";
import { describedBy, FieldMessage } from "./field-message";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hintId, errorId, hint, error)}
        className={cn(
          "min-h-11 rounded-control border bg-surface px-3 text-ink",
          error ? "border-danger" : "border-field-border",
          className,
        )}
        {...props}
      />
      <FieldMessage hintId={hintId} errorId={errorId} hint={hint} error={error} />
    </div>
  );
});
