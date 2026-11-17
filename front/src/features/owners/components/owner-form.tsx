"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { DOCUMENT_TYPE_LABELS, REGISTER_DOCUMENT_TYPES } from "@/features/auth/schemas";
import { isConflict, ownerErrorMessage } from "@/features/owners/errors";
import { ownerDocument } from "@/features/owners/labels";
import { ownerEditSchema, ownerSchema, type OwnerFormInput } from "@/features/owners/schemas";
import { FIELD_LIMITS } from "@/lib/constants";
import { createOwner, updateOwner, type UpdateOwnerInput } from "@/services/owners";
import type { Owner } from "@/types/domain";

const DOCUMENT_TAKEN_MESSAGE = "Esa cédula ya está registrada";
const EMAIL_TAKEN_MESSAGE = "Ese correo ya lo usa otra cuenta";

type OwnerFormProps = {
  // Sin propietario, el formulario crea uno nuevo.
  owner?: Owner;
  onCancel: () => void;
  onSaved: (owner: Owner) => void;
};

// Solo se envía lo que cambió; la API exige al menos un campo.
function changesOf(owner: Owner, input: OwnerFormInput): UpdateOwnerInput {
  const address = input.address || null;
  return {
    ...(input.firstNames !== owner.firstNames && { firstNames: input.firstNames }),
    ...(input.lastNames !== owner.lastNames && { lastNames: input.lastNames }),
    ...(input.email !== owner.email && { email: input.email }),
    ...(input.phone !== owner.phone && { phone: input.phone }),
    ...(address !== owner.address && { address }),
  };
}

export function OwnerForm({ owner, onCancel, onSaved }: OwnerFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OwnerFormInput>({
    resolver: zodResolver(owner ? ownerEditSchema : ownerSchema),
    defaultValues: owner
      ? {
          documentType: owner.documentType as OwnerFormInput["documentType"],
          documentNumber: owner.documentNumber,
          firstNames: owner.firstNames,
          lastNames: owner.lastNames,
          email: owner.email ?? "",
          phone: owner.phone,
          address: owner.address ?? "",
        }
      : { documentType: "CC" },
  });

  async function save(input: OwnerFormInput): Promise<Owner> {
    if (!owner) return createOwner({ ...input, address: input.address || undefined });
    const changes = changesOf(owner, input);
    if (Object.keys(changes).length === 0) return owner;
    return updateOwner(owner.id, changes);
  }

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      onSaved(await save(input));
    } catch (error) {
      if (!isConflict(error)) {
        setFormError(ownerErrorMessage(error));
      } else if (owner) {
        // D-18: el correo del propietario es también el de su cuenta.
        setError("email", { message: EMAIL_TAKEN_MESSAGE }, { shouldFocus: true });
      } else {
        setError("documentNumber", { message: DOCUMENT_TAKEN_MESSAGE }, { shouldFocus: true });
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
      <div className="grid gap-4 sm:grid-cols-2">
        {owner ? (
          <p className="text-muted sm:col-span-2">{ownerDocument(owner)}</p>
        ) : (
          <>
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
          </>
        )}
        <Field
          label="Nombres"
          autoComplete="off"
          maxLength={FIELD_LIMITS.NAME_MAX}
          error={errors.firstNames?.message}
          {...register("firstNames")}
        />
        <Field
          label="Apellidos"
          autoComplete="off"
          maxLength={FIELD_LIMITS.NAME_MAX}
          error={errors.lastNames?.message}
          {...register("lastNames")}
        />
      </div>
      <Field
        label="Correo electrónico"
        type="email"
        autoComplete="off"
        maxLength={FIELD_LIMITS.EMAIL_MAX}
        hint={
          owner?.hasAccount ? "Este también es el correo con el que entra al portal" : undefined
        }
        error={errors.email?.message}
        {...register("email")}
      />
      <Field
        label="Celular"
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        hint="10 dígitos, empieza por 3"
        maxLength={FIELD_LIMITS.PHONE_DIGITS}
        error={errors.phone?.message}
        {...register("phone")}
      />
      <Field
        label="Dirección (opcional)"
        autoComplete="off"
        maxLength={FIELD_LIMITS.ADDRESS_MAX}
        error={errors.address?.message}
        {...register("address")}
      />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {owner ? "Guardar" : "Registrar propietario"}
        </Button>
      </div>
    </form>
  );
}
