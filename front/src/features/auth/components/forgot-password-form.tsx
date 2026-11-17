"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field } from "@/components/ui/field";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
  type RecoveryMethod,
} from "@/features/auth/schemas";
import { forgotPassword } from "@/services/auth";
import { ApiError } from "@/services/http-client";

const RESET_LINK_MINUTES = 30; // RN-11

// Mismo texto exista o no la cuenta (D-31).
const SENT_MESSAGE = `Si los datos están registrados, te enviamos un enlace a tu correo. Vence en ${RESET_LINK_MINUTES} minutos.`;

const METHODS: { value: RecoveryMethod; label: string }[] = [
  { value: "email", label: "Correo" },
  { value: "document", label: "Cédula" },
];

function forgotErrorMessage(error: unknown): string {
  if (isNetworkError(error) || !(error instanceof ApiError)) return NETWORK_ERROR_MESSAGE;
  // Incluye el 429 del límite de intentos, que ya trae su propio mensaje.
  return error.message;
}

type ForgotPasswordFormProps = {
  onBack: () => void;
};

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { method: "email", value: "" },
  });
  const method = watch("method");

  function chooseMethod(next: RecoveryMethod) {
    setValue("method", next);
    setValue("value", "");
    clearErrors("value");
    setFormError(null);
  }

  const onSubmit = handleSubmit(async ({ method: chosen, value }) => {
    setFormError(null);
    const identifier = value.trim();
    try {
      await forgotPassword(
        chosen === "email" ? { email: identifier.toLowerCase() } : { documentNumber: identifier },
      );
      setSent(true);
    } catch (error) {
      setFormError(forgotErrorMessage(error));
    }
  });

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="status"
          className="rounded-control border border-success-border bg-success-bg px-4 py-3 text-sm text-ink"
        >
          {SENT_MESSAGE}
        </p>
        <p className="text-sm text-muted">
          Si no lo ves en unos minutos, revisa la carpeta de spam.
        </p>
        <Button variant="secondary" onClick={onBack}>
          Volver a iniciar sesión
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        Escribe el correo o la cédula de tu cuenta y te enviaremos un enlace para crear una
        contraseña nueva.
      </p>
      {formError && (
        <p
          role="alert"
          className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
        >
          {formError}
        </p>
      )}
      <div
        role="radiogroup"
        aria-label="Buscar mi cuenta por"
        className="grid grid-cols-2 gap-1 rounded-control bg-canvas p-1"
      >
        {METHODS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={method === value}
            onClick={() => chooseMethod(value)}
            className={cn(
              "min-h-11 rounded-control font-semibold transition-colors duration-150 ease-out",
              method === value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {method === "email" ? (
        <Field
          key="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tucorreo@ejemplo.com"
          error={errors.value?.message}
          {...register("value")}
        />
      ) : (
        <Field
          key="document"
          label="Número de cédula"
          inputMode="numeric"
          autoComplete="off"
          error={errors.value?.message}
          {...register("value")}
        />
      )}
      <Button type="submit" loading={isSubmitting}>
        Enviar enlace
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="min-h-11 self-center font-semibold text-brand-700 underline underline-offset-2"
      >
        Volver a iniciar sesión
      </button>
    </form>
  );
}
