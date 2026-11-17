"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { myContactSchema, type MyContactInput } from "@/features/owners/schemas";
import { FIELD_LIMITS } from "@/lib/constants";
import { ApiError } from "@/services/http-client";
import { localPhone } from "@/services/owners";
import { updateMyContact } from "@/services/users";
import type { OwnerSummary, UserProfile } from "@/types/auth";

type EditContactDialogProps = {
  open: boolean;
  owner: OwnerSummary;
  onClose: () => void;
  onSaved: (profile: UserProfile) => void;
};

export function EditContactDialog({ open, owner, onClose, onSaved }: EditContactDialogProps) {
  return (
    <Modal open={open} title="Editar datos" onClose={onClose}>
      {open && <EditContactForm owner={owner} onCancel={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

type EditContactFormProps = {
  owner: OwnerSummary;
  onCancel: () => void;
  onSaved: (profile: UserProfile) => void;
};

function EditContactForm({ owner, onCancel, onSaved }: EditContactFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MyContactInput>({
    resolver: zodResolver(myContactSchema),
    defaultValues: { phone: localPhone(owner.phone), address: owner.address ?? "" },
  });

  const onSubmit = handleSubmit(async ({ phone, address }) => {
    setFormError(null);
    try {
      onSaved(await updateMyContact({ phone, address: address?.trim() || null }));
    } catch (error) {
      setFormError(
        isNetworkError(error) || !(error instanceof ApiError)
          ? NETWORK_ERROR_MESSAGE
          : error.message,
      );
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
        label="Celular"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        maxLength={FIELD_LIMITS.PHONE_DIGITS}
        hint="10 dígitos, empieza por 3"
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
      <p className="text-sm text-muted">
        El correo y el documento no se pueden cambiar aquí. Para cambiarlos, acércate a la clínica.
      </p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
