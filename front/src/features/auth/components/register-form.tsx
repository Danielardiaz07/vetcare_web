"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { PasswordField } from "@/features/auth/components/password-field";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import {
  DOCUMENT_TYPE_LABELS,
  REGISTER_DOCUMENT_TYPES,
  registerSchema,
  type RegisterInput,
} from "@/features/auth/schemas";
import { FIELD_LIMITS, ROUTES } from "@/lib/constants";
import { register as registerAccount } from "@/services/auth";
import { ApiError } from "@/services/http-client";

const CONFLICT = 409;
const TOO_MANY_REQUESTS = 429;

type RegisterError = { kind: "email-taken" } | { kind: "message"; text: string };

// La API responde 409 con el mismo código en los tres casos; solo el texto los distingue.
function conflictError(apiMessage: string): RegisterError {
  if (apiMessage.includes("otro correo")) {
    return {
      kind: "message",
      text: "El correo no coincide con el registrado en la clínica. Acércate a recepción para actualizarlo",
    };
  }
  if (apiMessage.includes("ya tiene una cuenta")) {
    return {
      kind: "message",
      text: "Este documento ya tiene una cuenta. Inicia sesión o recupera tu acceso",
    };
  }
  return { kind: "email-taken" };
}

function registerError(error: unknown): RegisterError {
  if (isNetworkError(error) || !(error instanceof ApiError)) {
    return { kind: "message", text: NETWORK_ERROR_MESSAGE };
  }
  if (error.status === CONFLICT) return conflictError(error.message);
  if (error.status === TOO_MANY_REQUESTS) {
    return {
      kind: "message",
      text: "Hiciste demasiados intentos. Espera un momento y vuelve a intentarlo",
    };
  }
  return { kind: "message", text: error.message };
}

type RegisterFormProps = {
  onRegistered: (email: string, password: string) => void;
  onGoToLogin?: () => void;
};

export function RegisterForm({ onRegistered, onGoToLogin }: RegisterFormProps) {
  const { show } = useToast();
  const [formError, setFormError] = useState<RegisterError | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { documentType: "CC", acceptDataPolicy: false },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      const { email } = await registerAccount(input);
      onRegistered(email, input.password);
    } catch (error) {
      setFormError(registerError(error));
    }
  });

  const showRecoverNotice = () => show("Recuperar la contraseña estará disponible pronto.");

  const loginLink = onGoToLogin ? (
    <button type="button" onClick={onGoToLogin} className="font-semibold underline">
      Iniciar sesión
    </button>
  ) : (
    <Link href={ROUTES.login} className="font-semibold underline">
      Iniciar sesión
    </Link>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
        >
          {formError.kind === "email-taken" ? (
            <>
              <p>El correo ya está registrado</p>
              <p className="flex flex-wrap gap-x-4 gap-y-1">
                {loginLink}
                <button
                  type="button"
                  onClick={showRecoverNotice}
                  className="font-semibold underline"
                >
                  Recuperar contraseña
                </button>
              </p>
            </>
          ) : (
            <p>{formError.text}</p>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Tipo de documento"
          error={errors.documentType?.message}
          {...register("documentType")}
        >
          {REGISTER_DOCUMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {DOCUMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
        <Field
          label="Número de documento"
          inputMode="numeric"
          autoComplete="off"
          maxLength={FIELD_LIMITS.DOCUMENT_NUMBER_MAX}
          error={errors.documentNumber?.message}
          {...register("documentNumber")}
        />
        <Field
          label="Nombres"
          autoComplete="given-name"
          maxLength={FIELD_LIMITS.NAME_MAX}
          error={errors.firstNames?.message}
          {...register("firstNames")}
        />
        <Field
          label="Apellidos"
          autoComplete="family-name"
          maxLength={FIELD_LIMITS.NAME_MAX}
          error={errors.lastNames?.message}
          {...register("lastNames")}
        />
      </div>
      <Field
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="tucorreo@ejemplo.com"
        maxLength={FIELD_LIMITS.EMAIL_MAX}
        error={errors.email?.message}
        {...register("email")}
      />
      <Field
        label="Celular"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        hint="10 dígitos, empieza por 3"
        maxLength={FIELD_LIMITS.PHONE_DIGITS}
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Field
        label="Dirección (opcional)"
        autoComplete="street-address"
        maxLength={FIELD_LIMITS.ADDRESS_MAX}
        error={errors.address?.message}
        {...register("address")}
      />
      <PasswordField
        label="Contraseña"
        autoComplete="new-password"
        hint={`Mínimo ${FIELD_LIMITS.PASSWORD_MIN} caracteres, con una mayúscula y un número`}
        maxLength={FIELD_LIMITS.PASSWORD_MAX}
        error={errors.password?.message}
        {...register("password")}
      />
      <PasswordField
        label="Confirmar contraseña"
        autoComplete="new-password"
        maxLength={FIELD_LIMITS.PASSWORD_MAX}
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <Checkbox
        label={
          <>
            Acepto el tratamiento de mis datos personales (
            <Link href={ROUTES.dataPolicy} className="font-semibold text-brand-700 underline">
              ver la política
            </Link>
            )
          </>
        }
        error={errors.acceptDataPolicy?.message}
        {...register("acceptDataPolicy")}
      />
      <Button type="submit" loading={isSubmitting}>
        Crear cuenta
      </Button>
    </form>
  );
}
