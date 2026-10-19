"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { PasswordField } from "@/features/auth/components/password-field";
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { ApiError } from "@/services/http-client";
import type { SessionUser } from "@/types/auth";

const UNAUTHORIZED = 401;
const LOCKED = 423;
const TOO_MANY_REQUESTS = 429;
const LOGIN_LOCK_MINUTES = 15; // RN-08

const INVALID_CREDENTIALS_MESSAGE = "Correo o contraseña incorrectos";
const LOCKED_MESSAGE = `Tu cuenta está bloqueada por ${LOGIN_LOCK_MINUTES} minutos`;

function loginErrorMessage(error: unknown): string {
  if (isNetworkError(error) || !(error instanceof ApiError)) return NETWORK_ERROR_MESSAGE;
  // RN-09: el mensaje no dice si falló el correo o la contraseña.
  if (error.status === UNAUTHORIZED) return INVALID_CREDENTIALS_MESSAGE;
  if (error.status === LOCKED || error.status === TOO_MANY_REQUESTS) return LOCKED_MESSAGE;
  return error.message;
}

type LoginFormProps = {
  onSuccess?: (user: SessionUser) => void;
};

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { signIn } = useAuth();
  const { show } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      const user = await signIn(email, password);
      onSuccess?.(user);
    } catch (error) {
      setFormError(loginErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <p
          role="alert"
          className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
        >
          {formError}
        </p>
      )}
      <Field
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="tucorreo@ejemplo.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <PasswordField
        label="Contraseña"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <button
        type="button"
        onClick={() => show("Recuperar la contraseña estará disponible pronto.")}
        className="min-h-11 self-start font-semibold text-brand-700 underline underline-offset-2"
      >
        ¿Olvidaste tu contraseña?
      </button>
      <Button type="submit" loading={isSubmitting}>
        Ingresar
      </Button>
    </form>
  );
}
