"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
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
import { calculateAge } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { ApiError } from "@/services/http-client";
import { getOwner } from "@/services/owners";
import { deactivatePatient, listPatients } from "@/services/patients";
import type { Paginated } from "@/types/api";
import type { Patient } from "@/types/domain";

const SEARCH_DELAY_MS = 300;
const DIGITS_ONLY = /^\d+$/;
const UNKNOWN_OWNER = "No disponible";

type PatientRow = Patient & { ownerName: string };

type ListState =
  { status: "loading" } | { status: "error" } | { status: "ready"; result: Paginated<PatientRow> };

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
  const ownerNames = useRef(new Map<string, string>());
  const term = useDebouncedValue(search.trim(), SEARCH_DELAY_MS);

  // La API devuelve solo el id del propietario; los nombres se piden una vez y se guardan.
  const withOwnerNames = useCallback(async (patients: Patient[]): Promise<PatientRow[]> => {
    const missing = [...new Set(patients.map((pet) => pet.ownerId))].filter(
      (id) => !ownerNames.current.has(id),
    );
    const owners = await Promise.allSettled(missing.map((id) => getOwner(id)));
    for (const outcome of owners) {
      if (outcome.status === "fulfilled") {
        ownerNames.current.set(outcome.value.id, ownerFullName(outcome.value));
      }
    }
    return patients.map((pet) => ({
      ...pet,
      ownerName: ownerNames.current.get(pet.ownerId) ?? UNKNOWN_OWNER,
    }));
  }, []);

  useEffect(() => {
    let active = true;
    setList({ status: "loading" });
    // Solo dígitos es una cédula; lo demás es el nombre de la mascota.
    const filter = DIGITS_ONLY.test(term) ? { ownerDocument: term } : { q: term || undefined };
    listPatients({ page, ...filter })
      .then(async (result) => ({ ...result, data: await withOwnerNames(result.data) }))
      .then((result) => {
        if (active) setList({ status: "ready", result });
      })
      .catch(() => {
        if (active) setList({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [page, term, reloadKey, withOwnerNames]);

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

  const columns: DataTableColumn<PatientRow>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (pet) => (
        <span className="flex items-center gap-3">
          <PatientAvatar name={pet.name} />
          <span className="font-semibold">{pet.name}</span>
        </span>
      ),
    },
    { key: "species", header: "Especie", render: (pet) => SPECIES_LABELS[pet.species] },
    { key: "breed", header: "Raza", render: (pet) => pet.breed },
    { key: "age", header: "Edad", render: (pet) => calculateAge(pet.birthDate) },
    { key: "owner", header: "Propietario", render: (pet) => pet.ownerName },
    {
      key: "status",
      header: "Estado",
      render: (pet) =>
        pet.active ? (
          <StatusBadge tone="success">Activa</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Inactiva</StatusBadge>
        ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (pet) => (
        <span className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setEditing(pet)}
            aria-label={`Editar ${pet.name}`}
          >
            Editar
          </Button>
          {pet.active && (
            <Button
              variant="secondary"
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
          title="No hay mascotas"
          description={
            term
              ? "Ninguna mascota coincide con la búsqueda."
              : "Registra la primera con “Nueva mascota”."
          }
        />
      )}
      {list.status === "ready" && list.result.data.length > 0 && (
        <>
          <DataTable columns={columns} rows={list.result.data} getRowKey={(pet) => pet.id} />
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
