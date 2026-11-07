"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PasswordField } from "@/features/auth/components/password-field";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { RECOVER_PASSWORD_HREF } from "@/features/auth/redirects";
import { resetPasswordSchema, type ResetPasswordInput } from "@/features/auth/schemas";
import { FIELD_LIMITS, ROUTES } from "@/lib/constants";
import { resetPassword } from "@/services/auth";
import { ApiError } from "@/services/http-client";

const UNPROCESSABLE_ENTITY = 422;
const INVALID_LINK_MESSAGE = "El enlace es inválido o ya expiró. Solicita uno nuevo.";

type FormError = { kind: "invalid-link" } | { kind: "other"; text: string };

// La API responde 422 tanto para un enlace vencido como para uno ya usado (D-31).
function resetError(error: unknown): FormError {
  if (isNetworkError(error) || !(error instanceof ApiError)) {
    return { kind: "other", text: NETWORK_ERROR_MESSAGE };
  }
  if (error.status === UNPROCESSABLE_ENTITY && error.details.length === 0) {
    return { kind: "invalid-link" };
  }
  return { kind: "other", text: error.message };
}

function InvalidLink() {
  return (
    <div className="flex flex-col gap-4">
      <p
        role="alert"
        className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
      >
        {INVALID_LINK_MESSAGE}
      </p>
      <Link
        href={RECOVER_PASSWORD_HREF}
        className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-600 px-5 font-medium text-white transition-colors duration-150 ease-out hover:bg-brand-700"
      >
        Pedir otro enlace
      </Link>
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const { show } = useToast();
  const [formError, setFormError] = useState<FormError | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async (input) => {
    if (!token) return;
    setFormError(null);
    try {
      await resetPassword(token, input);
      show("Contraseña actualizada. Inicia sesión con la nueva", "success");
      router.replace(ROUTES.login);
    } catch (error) {
      setFormError(resetError(error));
    }
  });

  if (!token || formError?.kind === "invalid-link") return <InvalidLink />;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <p
          role="alert"
          className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
        >
          {formError.text}
        </p>
      )}
      <PasswordField
        label="Contraseña nueva"
        autoComplete="new-password"
        hint={`Mínimo ${FIELD_LIMITS.PASSWORD_MIN} caracteres, con una mayúscula y un número`}
        error={errors.password?.message}
        {...register("password")}
      />
      <PasswordField
        label="Confirma la contraseña"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <Button type="submit" loading={isSubmitting}>
        Guardar contraseña
      </Button>
    </form>
  );
}
