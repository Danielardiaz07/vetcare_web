"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { PasswordField } from "@/features/auth/components/password-field";
import { userErrorMessage } from "@/features/users/errors";
import { createUserSchema, STAFF_ROLES, type CreateUserFormInput } from "@/features/users/schemas";
import { FormError } from "@/features/users/components/form-error";
import { ROLE_LABELS } from "@/lib/panel-menu";
import { createUser } from "@/services/users";

type CreateUserModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateUserModal({ open, onClose, onCreated }: CreateUserModalProps) {
  return (
    <Modal open={open} title="Nueva cuenta" onClose={onClose}>
      {open && <CreateUserForm onCancel={onClose} onCreated={onCreated} />}
    </Modal>
  );
}

type CreateUserFormProps = {
  onCancel: () => void;
  onCreated: () => void;
};

function CreateUserForm({ onCancel, onCreated }: CreateUserFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormInput>({ resolver: zodResolver(createUserSchema) });

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      await createUser(input);
      onCreated();
    } catch (error) {
      setFormError(userErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />
      <Field
        label="Correo electrónico"
        type="email"
        autoComplete="off"
        error={errors.email?.message}
        {...register("email")}
      />
      <Select label="Rol" defaultValue="" error={errors.role?.message} {...register("role")}>
        <option value="" disabled>
          Selecciona el rol
        </option>
        {STAFF_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </Select>
      {/* D-20: no se envía correo; el administrador le entrega esta contraseña a la persona. */}
      <PasswordField
        label="Contraseña inicial"
        autoComplete="new-password"
        hint="Entrégasela a la persona; podrá entrar con ella de inmediato."
        error={errors.password?.message}
        {...register("password")}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Crear cuenta
        </Button>
      </div>
    </form>
  );
}
