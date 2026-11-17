"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { ownerLookupSchema, type OwnerLookupInput } from "@/features/agenda/schemas";
import { AppointmentWizard } from "@/features/appointments/components/appointment-wizard";
import { BookingDetails } from "@/features/appointments/components/booking-details";
import { ownerDocument, ownerFullName } from "@/features/owners/labels";
import { ownerErrorMessage } from "@/features/owners/errors";
import { ROUTES } from "@/lib/constants";
import { listOwners } from "@/services/owners";
import type { Owner } from "@/types/domain";

type NewAppointmentDialogProps = {
  open: boolean;
  onClose: () => void;
};

// RF-16: recepción agenda para clientes que llaman o llegan en persona.
export function NewAppointmentDialog({ open, onClose }: NewAppointmentDialogProps) {
  return (
    <Modal open={open} title="Nueva cita" onClose={onClose} wide>
      {open && <NewAppointmentFlow onClose={onClose} />}
    </Modal>
  );
}

type Stage = { name: "search" } | { name: "found"; owner: Owner } | { name: "book"; owner: Owner };

function NewAppointmentFlow({ onClose }: { onClose: () => void }) {
  const [stage, setStage] = useState<Stage>({ name: "search" });

  if (stage.name === "book") {
    return <AppointmentWizard owner={stage.owner} onDone={onClose} />;
  }
  if (stage.name === "found") {
    const { owner } = stage;
    return (
      <div className="flex flex-col gap-5">
        <BookingDetails
          rows={[
            { label: "Propietario", value: ownerFullName(owner) },
            { label: "Documento", value: ownerDocument(owner) },
            { label: "Celular", value: owner.phone },
            ...(owner.email ? [{ label: "Correo", value: owner.email }] : []),
          ]}
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button variant="secondary" onClick={() => setStage({ name: "search" })}>
            Buscar otra cédula
          </Button>
          <Button onClick={() => setStage({ name: "book", owner })}>Continuar</Button>
        </div>
      </div>
    );
  }
  return <OwnerSearch onFound={(owner) => setStage({ name: "found", owner })} />;
}

type SearchResult =
  { kind: "not-found" } | { kind: "inactive" } | { kind: "error"; message: string };

function OwnerSearch({ onFound }: { onFound: (owner: Owner) => void }) {
  const [result, setResult] = useState<SearchResult | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OwnerLookupInput>({ resolver: zodResolver(ownerLookupSchema) });

  // La API busca por texto; la cédula debe coincidir completa.
  const onSubmit = handleSubmit(async ({ documentNumber }) => {
    setResult(null);
    try {
      const { data } = await listOwners({ page: 1, q: documentNumber });
      const owner = data.find((item) => item.documentNumber === documentNumber);
      if (!owner) setResult({ kind: "not-found" });
      else if (!owner.active) setResult({ kind: "inactive" });
      else onFound(owner);
    } catch (error) {
      setResult({ kind: "error", message: ownerErrorMessage(error) });
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <Field
        label="Cédula del propietario"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        error={errors.documentNumber?.message}
        {...register("documentNumber")}
      />
      {result && (
        <div role="alert" className="flex flex-col gap-1 text-sm">
          {result.kind === "not-found" && (
            <>
              <p className="text-danger">No hay un propietario registrado con esa cédula.</p>
              <Link href={ROUTES.panelOwners} className="font-semibold text-brand-700 underline">
                Registrar propietario
              </Link>
            </>
          )}
          {result.kind === "inactive" && (
            <p className="text-danger">
              Este propietario está desactivado, así que no se le pueden agendar citas.
            </p>
          )}
          {result.kind === "error" && <p className="text-danger">{result.message}</p>}
        </div>
      )}
      <Button type="submit" loading={isSubmitting} className="self-start">
        Buscar
      </Button>
    </form>
  );
}
