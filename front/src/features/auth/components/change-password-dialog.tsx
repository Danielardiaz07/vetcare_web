"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { PasswordField } from "@/features/auth/components/password-field";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { changePasswordSchema, type ChangePasswordInput } from "@/features/auth/schemas";
import { FIELD_LIMITS } from "@/lib/constants";
import { ApiError } from "@/services/http-client";
import { changeMyPassword, CURRENT_PASSWORD_INCORRECT } from "@/services/users";

type ChangePasswordDialogProps = {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function ChangePasswordDialog({ open, onClose, onChanged }: ChangePasswordDialogProps) {
  return (
    <Modal open={open} title="Cambiar contraseña" onClose={onClose}>
      {open && <ChangePasswordForm onCancel={onClose} onChanged={onChanged} />}
    </Modal>
  );
}

type ChangePasswordFormProps = {
  onCancel: () => void;
  onChanged: () => void;
};

function ChangePasswordForm({ onCancel, onChanged }: ChangePasswordFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(changePasswordSchema) });

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      await changeMyPassword(input);
      onChanged();
    } catch (error) {
      if (isNetworkError(error) || !(error instanceof ApiError)) {
        setFormError(NETWORK_ERROR_MESSAGE);
      } else if (error.message === CURRENT_PASSWORD_INCORRECT) {
        setError("currentPassword", { message: "La contraseña actual es incorrecta" });
      } else {
        // Incluye el 429 (5 intentos cada 15 minutos), que ya trae su mensaje.
        setFormError(error.message);
      }
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
      <PasswordField
        label="Contraseña actual"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register("currentPassword")}
      />
      <PasswordField
        label="Contraseña nueva"
        autoComplete="new-password"
        hint={`Mínimo ${FIELD_LIMITS.PASSWORD_MIN} caracteres, con una mayúscula y un número`}
        error={errors.password?.message}
        {...register("password")}
      />
      <PasswordField
        label="Confirma la contraseña nueva"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      <p className="text-sm text-muted">
        Se cerrarán las sesiones de tus otros dispositivos; en este la sesión sigue abierta.
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Cambiar contraseña
        </Button>
      </div>
    </form>
  );
}
