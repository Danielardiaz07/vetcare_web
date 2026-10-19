"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { ownerDocument, ownerFullName } from "@/features/owners/labels";
import { AppointmentDurations } from "@/features/staff/components/appointment-durations";
import { ScheduleEditor } from "@/features/staff/components/schedule-editor";
import { StaffFormModal } from "@/features/staff/components/staff-form";
import { STAFF_KIND_LABELS, STAFF_KINDS } from "@/features/staff/labels";
import { ApiError } from "@/services/http-client";
import { listStaff, updateStaff, type StaffKind } from "@/services/staff";
import type { Paginated } from "@/types/api";
import type { StaffProfile } from "@/types/domain";

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; result: Paginated<StaffProfile> };

const tabId = (kind: StaffKind) => `staff-tab-${kind}`;
const panelId = (kind: StaffKind) => `staff-panel-${kind}`;

export function StaffManager() {
  const { show } = useToast();
  const [kind, setKind] = useState<StaffKind>("veterinarians");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<StaffProfile | null>(null);
  const [scheduling, setScheduling] = useState<StaffProfile | null>(null);
  const [toggling, setToggling] = useState<StaffProfile | null>(null);
  const [togglingBusy, setTogglingBusy] = useState(false);
  const labels = STAFF_KIND_LABELS[kind];

  useEffect(() => {
    let active = true;
    setList({ status: "loading" });
    listStaff(kind, { page })
      .then((result) => {
        if (active) setList({ status: "ready", result });
      })
      .catch(() => {
        if (active) setList({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [kind, page, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  function selectKind(next: StaffKind) {
    setKind(next);
    setPage(1);
  }

  // Las flechas mueven entre pestañas, como en un tablist nativo.
  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = STAFF_KINDS.find((item) => item !== kind) ?? kind;
    selectKind(next);
    document.getElementById(tabId(next))?.focus();
  }

  async function handleToggle(profile: StaffProfile) {
    setTogglingBusy(true);
    try {
      await updateStaff(kind, profile.id, { active: !profile.active });
      setToggling(null);
      show(profile.active ? "Perfil desactivado" : "Perfil activado", "success");
      reload();
    } catch (error) {
      show(
        isNetworkError(error) || !(error instanceof ApiError)
          ? NETWORK_ERROR_MESSAGE
          : error.message,
        "danger",
      );
    } finally {
      setTogglingBusy(false);
    }
  }

  const columns: DataTableColumn<StaffProfile>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (profile) => <span className="font-semibold">{ownerFullName(profile)}</span>,
    },
    { key: "document", header: "Documento", render: (profile) => ownerDocument(profile) },
    { key: "phone", header: "Celular", render: (profile) => profile.phone },
    ...(kind === "veterinarians"
      ? [
          {
            key: "specialty",
            header: "Especialidad",
            render: (profile: StaffProfile) => profile.specialty ?? "",
          },
        ]
      : []),
    {
      key: "status",
      header: "Estado",
      render: (profile) =>
        profile.active ? (
          <StatusBadge tone="success">Activo</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Inactivo</StatusBadge>
        ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (profile) => {
        const name = ownerFullName(profile);
        return (
          <span className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setEditing(profile)}
              aria-label={`Editar a ${name}`}
            >
              Editar
            </Button>
            <Button
              variant="secondary"
              onClick={() => setScheduling(profile)}
              aria-label={`Horario de ${name}`}
            >
              Horario
            </Button>
            <Button
              variant="secondary"
              onClick={() => setToggling(profile)}
              aria-label={`${profile.active ? "Desactivar" : "Activar"} a ${name}`}
            >
              {profile.active ? "Desactivar" : "Activar"}
            </Button>
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div role="tablist" aria-label="Tipo de personal" className="flex gap-2">
            {STAFF_KINDS.map((item) => {
              const selected = item === kind;
              return (
                <button
                  key={item}
                  id={tabId(item)}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={panelId(item)}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectKind(item)}
                  onKeyDown={handleTabKey}
                  className={cn(
                    "min-h-11 rounded-control border px-4 font-semibold transition-colors duration-150 ease-out",
                    selected
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-field-border bg-surface text-ink hover:bg-brand-50",
                  )}
                >
                  {STAFF_KIND_LABELS[item].tab}
                </button>
              );
            })}
          </div>
          <Button onClick={() => setCreating(true)}>{labels.create}</Button>
        </div>

        <div
          id={panelId(kind)}
          role="tabpanel"
          aria-labelledby={tabId(kind)}
          className="flex flex-col gap-4"
        >
          {list.status === "loading" && <LoadingState />}
          {list.status === "error" && <ErrorState onRetry={reload} />}
          {list.status === "ready" && list.result.data.length === 0 && (
            <EmptyState
              title={`No hay ${labels.tab.toLowerCase()}`}
              description={`Registra el primero con “${labels.create}”.`}
            />
          )}
          {list.status === "ready" && list.result.data.length > 0 && (
            <>
              <DataTable
                columns={columns}
                rows={list.result.data}
                getRowKey={(profile) => profile.id}
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
        </div>
      </div>

      <AppointmentDurations />

      <StaffFormModal
        open={creating || editing !== null}
        kind={kind}
        profile={editing ?? undefined}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          show(editing ? "Cambios guardados" : "Perfil registrado", "success");
          setCreating(false);
          setEditing(null);
          reload();
        }}
      />

      <ScheduleEditor kind={kind} profile={scheduling} onClose={() => setScheduling(null)} />

      <Modal
        open={toggling !== null}
        title={toggling?.active ? "Desactivar perfil" : "Activar perfil"}
        onClose={() => setToggling(null)}
      >
        {toggling && (
          <div className="flex flex-col gap-4">
            <p>
              ¿{toggling.active ? "Desactivar" : "Activar"} a{" "}
              <strong>{ownerFullName(toggling)}</strong>?
            </p>
            {toggling.active && (
              <p className="text-muted">
                No se elimina: deja de aparecer al agendar y conserva su historial.
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" disabled={togglingBusy} onClick={() => setToggling(null)}>
                Volver
              </Button>
              <Button
                variant={toggling.active ? "danger" : "primary"}
                loading={togglingBusy}
                onClick={() => void handleToggle(toggling)}
              >
                {toggling.active ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
