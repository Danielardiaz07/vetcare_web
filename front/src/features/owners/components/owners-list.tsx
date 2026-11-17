"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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
import { OwnerForm } from "@/features/owners/components/owner-form";
import { ownerFullName } from "@/features/owners/labels";
import { ROUTES } from "@/lib/constants";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { listOwners } from "@/services/owners";
import type { Paginated } from "@/types/api";
import type { Owner } from "@/types/domain";

const SEARCH_DELAY_MS = 300;

type ListState =
  { status: "loading" } | { status: "error" } | { status: "ready"; result: Paginated<Owner> };

const columns: DataTableColumn<Owner>[] = [
  {
    key: "document",
    header: "Documento",
    render: (owner) => `${owner.documentType} ${owner.documentNumber}`,
  },
  {
    key: "name",
    header: "Nombre",
    render: (owner) => (
      <Link
        href={ROUTES.panelOwner(owner.id)}
        className="font-semibold text-brand-700 underline underline-offset-2"
      >
        {ownerFullName(owner)}
      </Link>
    ),
  },
  { key: "phone", header: "Celular", render: (owner) => owner.phone },
  {
    key: "email",
    header: "Correo",
    render: (owner) => <span className="break-all">{owner.email ?? "Sin correo"}</span>,
  },
  {
    key: "status",
    header: "Estado",
    render: (owner) =>
      owner.active ? (
        <StatusBadge tone="success">Activo</StatusBadge>
      ) : (
        <StatusBadge tone="neutral">Inactivo</StatusBadge>
      ),
  },
];

export function OwnersList() {
  const router = useRouter();
  const { show } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const q = useDebouncedValue(search.trim(), SEARCH_DELAY_MS) || undefined;

  useEffect(() => {
    let active = true;
    setList({ status: "loading" });
    listOwners({ page, q })
      .then((result) => {
        if (active) setList({ status: "ready", result });
      })
      .catch(() => {
        if (active) setList({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [page, q, reloadKey]);

  // Una búsqueda nueva vuelve a la primera página.
  useEffect(() => setPage(1), [q]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="sm:flex-1">
          <Field
            label="Buscar por cédula o nombre"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button onClick={() => setCreating(true)}>Nuevo propietario</Button>
      </div>

      {list.status === "loading" && <LoadingState />}
      {list.status === "error" && <ErrorState onRetry={reload} />}
      {list.status === "ready" && list.result.data.length === 0 && (
        <EmptyState
          title="No hay propietarios"
          description={
            q
              ? "Ningún propietario coincide con la búsqueda."
              : "Registra el primero con “Nuevo propietario”."
          }
        />
      )}
      {list.status === "ready" && list.result.data.length > 0 && (
        <>
          <DataTable columns={columns} rows={list.result.data} getRowKey={(owner) => owner.id} />
          {list.result.meta.totalPages > 1 && (
            <Pagination
              page={list.result.meta.page}
              totalPages={list.result.meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Modal open={creating} title="Nuevo propietario" onClose={() => setCreating(false)}>
        {creating && (
          <OwnerForm
            onCancel={() => setCreating(false)}
            onSaved={(owner) => {
              setCreating(false);
              show("Propietario registrado", "success");
              router.push(ROUTES.panelOwner(owner.id));
            }}
          />
        )}
      </Modal>
    </div>
  );
}
