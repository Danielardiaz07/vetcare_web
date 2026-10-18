"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { ownerFullName } from "@/features/owners/labels";
import {
  SEX_LABELS,
  SEX_OPTIONS,
  SPECIES_LABELS,
  SPECIES_OPTIONS,
} from "@/features/patients/labels";
import { patientSchema, type PatientFormInput } from "@/features/patients/schemas";
import { FIELD_LIMITS } from "@/lib/constants";
import { ApiError } from "@/services/http-client";
import { listOwners } from "@/services/owners";
import { createPatient, updatePatient, type UpdatePatientInput } from "@/services/patients";
import type { Owner, Patient } from "@/types/domain";

type PatientFormModalProps = {
  open: boolean;
  // Con mascota, el formulario la edita; sin ella, crea una nueva.
  patient?: Patient;
  // Desde la ficha del propietario ya viene elegido; desde la lista se busca por cédula.
  owner?: Owner;
  onClose: () => void;
  onSaved: (patient: Patient) => void;
};

export function PatientFormModal({
  open,
  patient,
  owner,
  onClose,
  onSaved,
}: PatientFormModalProps) {
  return (
    <Modal open={open} title={patient ? "Editar mascota" : "Nueva mascota"} onClose={onClose}>
      {open && (
        <PatientForm
          key={patient?.id ?? "new"}
          patient={patient}
          owner={owner}
          onCancel={onClose}
          onSaved={onSaved}
        />
      )}
    </Modal>
  );
}

const errorMessage = (error: unknown) =>
  isNetworkError(error) || !(error instanceof ApiError) ? NETWORK_ERROR_MESSAGE : error.message;

// Solo se envía lo que cambió; la API exige al menos un campo.
function changesOf(patient: Patient, input: PatientFormInput): UpdatePatientInput {
  const keys = Object.keys(input) as (keyof PatientFormInput)[];
  return Object.fromEntries(
    keys.filter((key) => input[key] !== patient[key]).map((key) => [key, input[key]]),
  );
}

type PatientFormProps = {
  patient?: Patient;
  owner?: Owner;
  onCancel: () => void;
  onSaved: (patient: Patient) => void;
};

function PatientForm({ patient, owner: presetOwner, onCancel, onSaved }: PatientFormProps) {
  const [owner, setOwner] = useState<Owner | undefined>(presetOwner);
  const [ownerDocument, setOwnerDocument] = useState("");
  const [ownerError, setOwnerError] = useState<string | null>(null);
  const [searchingOwner, setSearchingOwner] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PatientFormInput>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient
      ? {
          name: patient.name,
          species: patient.species,
          breed: patient.breed,
          sex: patient.sex,
          birthDate: patient.birthDate,
          weightKg: patient.weightKg,
        }
      : undefined,
  });
  const needsOwner = !patient && !presetOwner;

  async function findOwner() {
    const documentNumber = ownerDocument.trim();
    setOwnerError(null);
    setOwner(undefined);
    if (!documentNumber) {
      setOwnerError("Escribe la cédula del propietario");
      return;
    }
    setSearchingOwner(true);
    try {
      const { data } = await listOwners({ page: 1, q: documentNumber });
      const found = data.find((item) => item.documentNumber === documentNumber && item.active);
      if (found) setOwner(found);
      else setOwnerError("No hay un propietario activo con esa cédula");
    } catch (error) {
      setOwnerError(errorMessage(error));
    } finally {
      setSearchingOwner(false);
    }
  }

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    if (!patient && !owner) {
      setOwnerError("Busca y elige el propietario");
      return;
    }
    try {
      if (patient) {
        const changes = changesOf(patient, input);
        onSaved(
          Object.keys(changes).length > 0 ? await updatePatient(patient.id, changes) : patient,
        );
      } else if (owner) {
        onSaved(await createPatient({ ...input, ownerId: owner.id }));
      }
    } catch (error) {
      setFormError(errorMessage(error));
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
      {needsOwner ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Field
                label="Cédula del propietario"
                inputMode="numeric"
                autoComplete="off"
                maxLength={FIELD_LIMITS.DOCUMENT_NUMBER_MAX}
                value={ownerDocument}
                onChange={(event) => setOwnerDocument(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void findOwner();
                  }
                }}
                aria-invalid={ownerError ? true : undefined}
              />
            </div>
            <Button variant="secondary" loading={searchingOwner} onClick={() => void findOwner()}>
              Buscar
            </Button>
          </div>
          {ownerError && (
            <p role="alert" className="text-sm text-danger">
              {ownerError}
            </p>
          )}
          {owner && <p className="text-sm text-success">Propietario: {ownerFullName(owner)}</p>}
        </div>
      ) : (
        owner && <p className="text-muted">Propietario: {ownerFullName(owner)}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nombre"
          autoComplete="off"
          maxLength={FIELD_LIMITS.PATIENT_NAME_MAX}
          error={errors.name?.message}
          {...register("name")}
        />
        <Select
          label="Especie"
          defaultValue=""
          error={errors.species?.message}
          {...register("species")}
        >
          <option value="" disabled>
            Selecciona la especie
          </option>
          {SPECIES_OPTIONS.map((species) => (
            <option key={species} value={species}>
              {SPECIES_LABELS[species]}
            </option>
          ))}
        </Select>
        <Field
          label="Raza"
          autoComplete="off"
          maxLength={FIELD_LIMITS.BREED_MAX}
          error={errors.breed?.message}
          {...register("breed")}
        />
        <Select label="Sexo" defaultValue="" error={errors.sex?.message} {...register("sex")}>
          <option value="" disabled>
            Selecciona el sexo
          </option>
          {SEX_OPTIONS.map((sex) => (
            <option key={sex} value={sex}>
              {SEX_LABELS[sex]}
            </option>
          ))}
        </Select>
        <Field
          label="Fecha de nacimiento"
          type="date"
          error={errors.birthDate?.message}
          {...register("birthDate")}
        />
        <Field
          label="Peso (kg)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0.1"
          max={FIELD_LIMITS.WEIGHT_KG_MAX}
          error={errors.weightKg?.message}
          {...register("weightKg", { valueAsNumber: true })}
        />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {patient ? "Guardar" : "Registrar mascota"}
        </Button>
      </div>
    </form>
  );
}
