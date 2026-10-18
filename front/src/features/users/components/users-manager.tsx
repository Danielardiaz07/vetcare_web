"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { CreateUserModal } from "@/features/users/components/create-user-modal";
import { EditUserModal } from "@/features/users/components/edit-user-modal";
import { STATUS_LABELS } from "@/features/users/labels";
import { MANAGEABLE_STATUSES, STAFF_ROLES } from "@/features/users/schemas";
import { ROLE_LABELS } from "@/lib/panel-menu";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { listUsers, type ListUsersParams } from "@/services/users";
import type { Paginated } from "@/types/api";
import type { StaffUser } from "@/types/auth";

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 300;

type ListState =
  { status: "loading" } | { status: "error" } | { status: "ready"; result: Paginated<StaffUser> };

export function UsersManager() {
  const { user: sessionUser } = useAuth();
  const { show } = useToast();
  const [role, setRole] = useState<ListUsersParams["role"]>();
  const [status, setStatus] = useState<ListUsersParams["status"]>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const q = useDebouncedValue(search.trim(), SEARCH_DELAY_MS) || undefined;

  useEffect(() => {
    let active = true;
    setList({ status: "loading" });
    listUsers({ page, limit: PAGE_SIZE, role, status, q })
      .then((result) => {
        if (active) setList({ status: "ready", result });
      })
      .catch(() => {
        if (active) setList({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [page, role, status, q, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Cambiar un filtro vuelve a la primera página.
  useEffect(() => setPage(1), [role, status, q]);

  const columns: DataTableColumn<StaffUser>[] = [
    {
      key: "email",
      header: "Correo",
      render: (row) => (
        <span className="break-all">
          {row.email}
          {row.id === sessionUser?.id && <span className="ml-2 text-sm text-subtle">(tú)</span>}
        </span>
      ),
    },
    { key: "role", header: "Rol", render: (row) => ROLE_LABELS[row.role] },
    {
      key: "status",
      header: "Estado",
      render: (row) => (
        <StatusBadge tone={STATUS_LABELS[row.status].tone}>
          {STATUS_LABELS[row.status].label}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (row) => (
        <Button
          variant="secondary"
          onClick={() => setEditing(row)}
          aria-label={`Editar ${row.email}`}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="sm:min-w-64 sm:flex-1">
          <Field
            label="Buscar por correo"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          label="Rol"
          value={role ?? ""}
          onChange={(event) => setRole((event.target.value || undefined) as typeof role)}
        >
          <option value="">Todos los roles</option>
          {STAFF_ROLES.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABELS[value]}
            </option>
          ))}
        </Select>
        <Select
          label="Estado"
          value={status ?? ""}
          onChange={(event) => setStatus((event.target.value || undefined) as typeof status)}
        >
          <option value="">Todos los estados</option>
          {MANAGEABLE_STATUSES.map((value) => (
            <option key={value} value={value}>
              {STATUS_LABELS[value].label}
            </option>
          ))}
        </Select>
        <Button onClick={() => setCreating(true)}>Nueva cuenta</Button>
      </div>

      {list.status === "loading" && <LoadingState />}
      {list.status === "error" && <ErrorState onRetry={reload} />}
      {list.status === "ready" && list.result.data.length === 0 && (
        <EmptyState
          title="No hay cuentas"
          description="Ninguna cuenta del personal coincide con la búsqueda o los filtros."
        />
      )}
      {list.status === "ready" && list.result.data.length > 0 && (
        <>
          <DataTable columns={columns} rows={list.result.data} getRowKey={(row) => row.id} />
          {list.result.meta.totalPages > 1 && (
            <Pagination
              page={list.result.meta.page}
              totalPages={list.result.meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <CreateUserModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => {
          setCreating(false);
          show("Cuenta creada", "success");
          reload();
        }}
      />
      <EditUserModal
        user={editing}
        isSelf={editing?.id === sessionUser?.id}
        onClose={() => setEditing(null)}
        onSaved={(message) => {
          setEditing(null);
          show(message, "success");
          reload();
        }}
      />
    </div>
  );
}
