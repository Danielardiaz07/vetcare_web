"use client";

import { forwardRef, useId, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";
import { describedBy, FieldMessage } from "./field-message";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, id, className, rows = 3, ...props },
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
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hintId, errorId, hint, error)}
        className={cn(
          "rounded-control border bg-surface px-3 py-2 text-ink",
          error ? "border-danger" : "border-field-border",
          className,
        )}
        {...props}
      />
      <FieldMessage hintId={hintId} errorId={errorId} hint={hint} error={error} />
    </div>
  );
});
