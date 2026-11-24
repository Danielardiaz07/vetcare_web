"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { ownerFullName } from "@/features/owners/labels";
import { PatientAvatar } from "@/features/patients/components/patient-avatar";
import { PatientFormModal } from "@/features/patients/components/patient-form";
import { SPECIES_LABELS } from "@/features/patients/labels";
import { ROUTES } from "@/lib/constants";
import { calculateAge } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { ApiError } from "@/services/http-client";
import { deactivatePatient, listPatients } from "@/services/patients";
import type { Paginated } from "@/types/api";
import type { Patient } from "@/types/domain";

const SEARCH_DELAY_MS = 300;
const DIGITS_ONLY = /^\d+$/;

type ListState =
  { status: "loading" } | { status: "error" } | { status: "ready"; result: Paginated<Patient> };

export function PatientsList() {
  const { show } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [deactivating, setDeactivating] = useState<Patient | null>(null);
  const [deactivatingBusy, setDeactivatingBusy] = useState(false);
  const term = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);

  useEffect(() => {
    let active = true;
    setList({ status: "loading" });
    // Solo dígitos es una cédula; lo demás es el nombre de la mascota.
    const filter = DIGITS_ONLY.test(term) ? { ownerDocument: term } : { q: term || undefined };
    listPatients({ page, ...filter })
      .then((result) => {
        if (active) setList({ status: "ready", result });
      })
      .catch(() => {
        if (active) setList({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [page, term, reloadKey]);

  // Una búsqueda nueva vuelve a la primera página.
  useEffect(() => setPage(1), [term]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  async function handleDeactivate(patient: Patient) {
    setDeactivatingBusy(true);
    try {
      await deactivatePatient(patient.id);
      setDeactivating(null);
      show("Mascota desactivada", "success");
      reload();
    } catch (error) {
      const message =
        isNetworkError(error) || !(error instanceof ApiError)
          ? NETWORK_ERROR_MESSAGE
          : error.message;
      show(message, "danger");
    } finally {
      setDeactivatingBusy(false);
    }
  }

  const columns: DataTableColumn<Patient>[] = [
    {
      key: "name",
      header: "Nombre",
      headerClassName: "pl-16",
      render: (pet) => (
        <Link
          href={ROUTES.panelPatient(pet.id)}
          className="flex min-h-11 items-center gap-3 font-semibold text-brand-700"
        >
          <PatientAvatar name={pet.name} />
          <span className="underline underline-offset-2">{pet.name}</span>
        </Link>
      ),
    },
    { key: "species", header: "Especie", render: (pet) => SPECIES_LABELS[pet.species] },
    { key: "breed", header: "Raza", render: (pet) => pet.breed },
    {
      key: "age",
      header: "Edad",
      render: (pet) => (
        <span className="[overflow-wrap:normal]">{calculateAge(pet.birthDate)}</span>
      ),
    },
    { key: "owner", header: "Propietario", render: (pet) => ownerFullName(pet.owner) },
    {
      key: "status",
      header: "Estado",
      render: (pet) => (
        <span className="inline-flex w-max whitespace-nowrap [overflow-wrap:normal]">
          <StatusBadge tone={pet.active ? "success" : "neutral"}>
            {pet.active ? "Activa" : "Inactiva"}
          </StatusBadge>
        </span>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (pet) => (
        <span className="flex flex-wrap gap-2 md:flex-nowrap">
          <Button
            variant="secondary"
            className="size-11 shrink-0 border-brand-200! bg-brand-50! px-0! text-brand-700! hover:bg-brand-100!"
            onClick={() => setEditing(pet)}
            aria-label={`Editar ${pet.name}`}
            title="Editar"
          >
            <Icon name="pencil" className="size-4" />
          </Button>
          {pet.active && (
            <Button
              variant="secondary"
              className="shrink-0 border-line! bg-canvas! px-3! text-muted! whitespace-nowrap hover:border-danger-border! hover:bg-danger-bg! hover:text-danger!"
              onClick={() => setDeactivating(pet)}
              aria-label={`Desactivar ${pet.name}`}
            >
              Desactivar
            </Button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="sm:flex-1">
          <Field
            label="Buscar por nombre de la mascota o cédula del propietario"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button onClick={() => setCreating(true)}>Nueva mascota</Button>
      </div>

      {list.status === "loading" && <LoadingState />}
      {list.status === "error" && <ErrorState onRetry={reload} />}
      {list.status === "ready" && list.result.data.length === 0 && (
        <EmptyState
          title={term ? "Sin resultados" : "Aún no hay mascotas"}
          description={
            term
              ? "Ninguna mascota coincide con la búsqueda."
              : "Consulta sus datos y accede a su historial clínico."
          }
          action={
            term ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                Limpiar búsqueda
              </Button>
            ) : (
              <Button onClick={() => setCreating(true)}>Nueva mascota</Button>
            )
          }
        />
      )}
      {list.status === "ready" && list.result.data.length > 0 && (
        <>
          <DataTable
            columns={columns}
            rows={list.result.data}
            getRowKey={(pet) => pet.id}
            tableClassName="min-w-3xl"
          />
          {list.result.meta.totalPages > 1 && (
            <Pagination
              page={list.result.meta.page}
              totalPages={list.result.meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <PatientFormModal
        open={creating || editing !== null}
        patient={editing ?? undefined}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          show(editing ? "Cambios guardados" : "Mascota registrada", "success");
          setCreating(false);
          setEditing(null);
          reload();
        }}
      />

      <Modal
        open={deactivating !== null}
        title="Desactivar mascota"
        onClose={() => setDeactivating(null)}
      >
        {deactivating && (
          <div className="flex flex-col gap-4">
            <p>
              ¿Desactivar a <strong>{deactivating.name}</strong>?
            </p>
            <p className="text-muted">No se elimina: su historial clínico se conserva.</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                disabled={deactivatingBusy}
                onClick={() => setDeactivating(null)}
              >
                Volver
              </Button>
              <Button
                variant="danger"
                loading={deactivatingBusy}
                onClick={() => void handleDeactivate(deactivating)}
              >
                Desactivar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
