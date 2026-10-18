"use client";

import { forwardRef, useId, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/components/ui/cn";
import { describedBy, FieldMessage } from "@/components/ui/field-message";
import { Icon } from "@/components/ui/icon";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  hint?: string;
  error?: string;
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, hint, error, id, className, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = `${inputId}-hint`;
    const errorId = `${inputId}-error`;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(hintId, errorId, hint, error)}
            className={cn(
              "min-h-11 w-full rounded-control border bg-surface pr-12 pl-3 text-ink",
              error ? "border-danger" : "border-field-border",
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-control text-muted hover:text-ink"
          >
            <Icon name={visible ? "eye-off" : "eye"} className="size-5" />
          </button>
        </div>
        <FieldMessage hintId={hintId} errorId={errorId} hint={hint} error={error} />
      </div>
    );
  },
);
