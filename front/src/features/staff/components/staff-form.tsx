"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { DOCUMENT_TYPE_LABELS, REGISTER_DOCUMENT_TYPES } from "@/features/auth/schemas";
import { ownerDocument } from "@/features/owners/labels";
import { STAFF_KIND_LABELS } from "@/features/staff/labels";
import {
  groomerEditSchema,
  groomerSchema,
  veterinarianEditSchema,
  veterinarianSchema,
  type StaffFormInput,
} from "@/features/staff/schemas";
import { FIELD_LIMITS, ROUTES } from "@/lib/constants";
import { ApiError } from "@/services/http-client";
import {
  createStaff,
  listAccountsWithoutProfile,
  updateStaff,
  type StaffKind,
  type UpdateStaffInput,
} from "@/services/staff";
import type { StaffUser } from "@/types/auth";
import type { StaffProfile } from "@/types/domain";

const CONFLICT = 409;
const DOCUMENT_TAKEN_MESSAGE = "Esa cédula ya está registrada";

type AccountsState =
  { status: "loading" } | { status: "error" } | { status: "ready"; accounts: StaffUser[] };

function errorMessage(error: unknown): string {
  if (isNetworkError(error) || !(error instanceof ApiError)) return NETWORK_ERROR_MESSAGE;
  return error.message;
}

// Solo se envía lo que cambió; la API exige al menos un campo.
function changesOf(
  profile: StaffProfile,
  input: StaffFormInput,
  withSpecialty: boolean,
): UpdateStaffInput {
  return {
    ...(input.firstNames !== profile.firstNames && { firstNames: input.firstNames }),
    ...(input.lastNames !== profile.lastNames && { lastNames: input.lastNames }),
    ...(input.phone !== profile.phone && { phone: input.phone }),
    ...(withSpecialty && input.specialty !== profile.specialty && { specialty: input.specialty }),
  };
}

type StaffFormProps = {
  kind: StaffKind;
  profile?: StaffProfile;
  onCancel: () => void;
  onSaved: () => void;
};

function StaffForm({ kind, profile, onCancel, onSaved }: StaffFormProps) {
  const isVeterinarian = kind === "veterinarians";
  const labels = STAFF_KIND_LABELS[kind];
  const [formError, setFormError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountsState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const schema = profile
    ? isVeterinarian
      ? veterinarianEditSchema
      : groomerEditSchema
    : isVeterinarian
      ? veterinarianSchema
      : groomerSchema;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormInput>({
    resolver: zodResolver(schema),
    defaultValues: profile
      ? {
          userId: profile.userId ?? "",
          documentType: profile.documentType as StaffFormInput["documentType"],
          documentNumber: profile.documentNumber,
          firstNames: profile.firstNames,
          lastNames: profile.lastNames,
          phone: profile.phone,
          specialty: profile.specialty ?? "",
        }
      : { userId: "", documentType: "CC", specialty: "" },
  });

  useEffect(() => {
    if (profile) return;
    let active = true;
    setAccounts({ status: "loading" });
    listAccountsWithoutProfile(kind)
      .then((result) => {
        if (active) setAccounts({ status: "ready", accounts: result });
      })
      .catch(() => {
        if (active) setAccounts({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [kind, profile, reloadKey]);

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      if (profile) {
        const changes = changesOf(profile, input, isVeterinarian);
        if (Object.keys(changes).length > 0) await updateStaff(kind, profile.id, changes);
      } else {
        await createStaff(kind, {
          userId: input.userId,
          documentType: input.documentType,
          documentNumber: input.documentNumber,
          firstNames: input.firstNames,
          lastNames: input.lastNames,
          phone: input.phone,
          ...(isVeterinarian && { specialty: input.specialty }),
        });
      }
      onSaved();
    } catch (error) {
      const documentTaken =
        error instanceof ApiError && error.status === CONFLICT && /cedula/i.test(error.message);
      if (documentTaken) {
        setError("documentNumber", { message: DOCUMENT_TAKEN_MESSAGE }, { shouldFocus: true });
      } else {
        setFormError(errorMessage(error));
      }
    }
  });

  if (!profile && accounts.status === "loading") return <LoadingState rows={2} />;
  if (!profile && accounts.status === "error") {
    return (
      <div className="flex flex-col gap-4">
        <p role="alert" className="text-danger">
          {NETWORK_ERROR_MESSAGE}
        </p>
        <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
          Reintentar
        </Button>
      </div>
    );
  }
  if (!profile && accounts.status === "ready" && accounts.accounts.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p>{labels.noAccounts}</p>
        <p className="text-muted">
          Primero crea la cuenta con ese rol en Usuarios y luego vuelve a registrar el perfil.
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Volver
          </Button>
          <Link
            href={ROUTES.panelUsers}
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-600 px-5 font-medium text-white hover:bg-brand-700"
          >
            Ir a Usuarios
          </Link>
        </div>
      </div>
    );
  }

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
      {profile ? (
        <p className="text-muted">{ownerDocument(profile)}</p>
      ) : (
        <>
          <Select label="Cuenta de usuario" error={errors.userId?.message} {...register("userId")}>
            <option value="" disabled>
              Selecciona una cuenta
            </option>
            {accounts.status === "ready" &&
              accounts.accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.email}
                </option>
              ))}
          </Select>
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
          </div>
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
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
        label="Celular"
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        hint="10 dígitos, empieza por 3"
        maxLength={FIELD_LIMITS.PHONE_DIGITS}
        error={errors.phone?.message}
        {...register("phone")}
      />
      {isVeterinarian && (
        <Field
          label="Especialidad"
          autoComplete="off"
          maxLength={FIELD_LIMITS.SPECIALTY_MAX}
          error={errors.specialty?.message}
          {...register("specialty")}
        />
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {profile ? "Guardar" : `Registrar ${labels.singular}`}
        </Button>
      </div>
    </form>
  );
}

type StaffFormModalProps = {
  open: boolean;
  kind: StaffKind;
  profile?: StaffProfile;
  onClose: () => void;
  onSaved: () => void;
};

export function StaffFormModal({ open, kind, profile, onClose, onSaved }: StaffFormModalProps) {
  const labels = STAFF_KIND_LABELS[kind];
  return (
    <Modal
      open={open}
      title={profile ? `Editar ${labels.singular}` : labels.create}
      onClose={onClose}
    >
      {open && (
        <StaffForm
          key={profile?.id ?? kind}
          kind={kind}
          profile={profile}
          onCancel={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}
