"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { PasswordField } from "@/features/auth/components/password-field";
import { FormError } from "@/features/users/components/form-error";
import { userErrorMessage } from "@/features/users/errors";
import { STATUS_LABELS } from "@/features/users/labels";
import {
  editUserSchema,
  MANAGEABLE_STATUSES,
  STAFF_ROLES,
  type EditUserFormInput,
} from "@/features/users/schemas";
import { ROLE_LABELS } from "@/lib/panel-menu";
import { updateUser, type UpdateUserInput } from "@/services/users";
import type { StaffUser } from "@/types/auth";

const SUSPEND_WARNING = "La persona no podrá entrar y se cerrarán sus sesiones";

type EditUserModalProps = {
  user: StaffUser | null;
  isSelf: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
};

export function EditUserModal({ user, isSelf, onClose, onSaved }: EditUserModalProps) {
  return (
    <Modal open={user !== null} title="Editar cuenta" onClose={onClose}>
      {user && (
        <EditUserForm
          key={user.id}
          user={user}
          isSelf={isSelf}
          onCancel={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

type EditUserFormProps = {
  user: StaffUser;
  isSelf: boolean;
  onCancel: () => void;
  onSaved: (message: string) => void;
};

// Solo se envía lo que cambió; la API exige al menos un campo.
function changesOf(user: StaffUser, input: EditUserFormInput, isSelf: boolean): UpdateUserInput {
  const changes: UpdateUserInput = {};
  // La API también rechaza que el administrador cambie su propio rol o estado.
  if (!isSelf && input.role !== user.role) changes.role = input.role;
  if (!isSelf && input.status !== user.status) changes.status = input.status;
  if (input.changePassword) changes.password = input.password;
  return changes;
}

function EditUserForm({ user, isSelf, onCancel, onSaved }: EditUserFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingSuspension, setPendingSuspension] = useState<UpdateUserInput | null>(null);
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<EditUserFormInput>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      role: user.role,
      status: user.status === "SUSPENDED" ? "SUSPENDED" : "ACTIVE",
      changePassword: false,
      password: "",
    },
  });
  const changePassword = watch("changePassword");

  async function save(changes: UpdateUserInput) {
    setFormError(null);
    setSaving(true);
    try {
      await updateUser(user.id, changes);
      if (changes.status === "SUSPENDED") onSaved("Cuenta suspendida");
      else if (changes.status === "ACTIVE") onSaved("Cuenta reactivada");
      else onSaved("Cambios guardados");
    } catch (error) {
      setPendingSuspension(null);
      setFormError(userErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const onSubmit = handleSubmit((input) => {
    const changes = changesOf(user, input, isSelf);
    if (Object.keys(changes).length === 0) {
      setFormError("No hay cambios para guardar");
      return;
    }
    if (changes.status === "SUSPENDED") {
      setPendingSuspension(changes);
      return;
    }
    void save(changes);
  });

  if (pendingSuspension) {
    return (
      <div className="flex flex-col gap-4">
        <p>
          ¿Suspender la cuenta <strong className="break-all">{user.email}</strong>?
        </p>
        <p className="text-muted">{SUSPEND_WARNING}.</p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={saving} onClick={() => setPendingSuspension(null)}>
            Volver
          </Button>
          <Button variant="danger" loading={saving} onClick={() => void save(pendingSuspension)}>
            Suspender
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />
      <p className="break-all text-muted">{user.email}</p>
      {isSelf ? (
        <p className="text-sm text-subtle">
          Es tu cuenta: no puedes cambiar tu propio rol ni suspenderla.
        </p>
      ) : (
        <>
          <Select label="Rol" error={errors.role?.message} {...register("role")}>
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
          <Select label="Estado" error={errors.status?.message} {...register("status")}>
            {MANAGEABLE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status].label}
              </option>
            ))}
          </Select>
        </>
      )}
      <Checkbox label="Cambiar contraseña" {...register("changePassword")} />
      {changePassword && (
        <PasswordField
          label="Nueva contraseña"
          autoComplete="new-password"
          hint="Se cerrarán las sesiones abiertas de esta cuenta."
          error={errors.password?.message}
          {...register("password")}
        />
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={saving}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
