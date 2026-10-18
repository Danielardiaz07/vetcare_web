"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "./cn";
import { describedBy, FieldMessage } from "./field-message";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  hint?: string;
  error?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, hint, error, id, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-11 items-center gap-3">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(hintId, errorId, hint, error)}
          className={cn("size-5 accent-brand-600", className)}
          {...props}
        />
        <label htmlFor={inputId} className="text-sm text-ink">
          {label}
        </label>
      </div>
      <FieldMessage hintId={hintId} errorId={errorId} hint={hint} error={error} />
    </div>
  );
});
