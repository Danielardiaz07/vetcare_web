"use client";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { InventoryAlertsSummary } from "@/features/inventory/components/inventory-alerts-summary";
import {
  InventoryItemModal,
  type InventoryModalTarget,
} from "@/features/inventory/components/inventory-item-modal";
import { INVENTORY_TABS, inventoryBadges, KIND_LABELS } from "@/features/inventory/labels";
import { formatCop, formatDate } from "@/lib/format";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { getInventoryAlerts, listInventory, type InventoryAlertFilter } from "@/services/inventory";
import type { Paginated } from "@/types/api";
import type { InventoryAlerts, InventoryItem, InventoryKind } from "@/types/domain";

const PAGE_SIZE = 10;
const SEARCH_DELAY_MS = 300;

const ALERT_FILTER_LABELS: Record<InventoryAlertFilter, string> = {
  LOW_STOCK: "Solo stock crítico",
  EXPIRING: "Solo por vencer o vencidos",
};

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; result: Paginated<InventoryItem> };

type AlertsState =
  { status: "loading" } | { status: "error" } | { status: "ready"; alerts: InventoryAlerts };

const tabId = (kind: InventoryKind) => `inventory-tab-${kind}`;
const panelId = (kind: InventoryKind) => `inventory-panel-${kind}`;

// RF-22, HU-18: medicamentos y vacunas con stock, precio y vencimiento, solo para el administrador.
export function InventoryManager() {
  const { show } = useToast();
  const [kind, setKind] = useState<InventoryKind>("MEDICATION");
  const [search, setSearch] = useState("");
  const [alert, setAlert] = useState<InventoryAlertFilter>();
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [alerts, setAlerts] = useState<AlertsState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [modal, setModal] = useState<InventoryModalTarget | null>(null);
  const q = useDebouncedValue(search.trim(), SEARCH_DELAY_MS) || undefined;

  useEffect(() => {
    let active = true;
    setList({ status: "loading" });
    listInventory(kind, { page, limit: PAGE_SIZE, q, alert })
      .then((result) => {
        if (active) setList({ status: "ready", result });
      })
      .catch(() => {
        if (active) setList({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [kind, page, q, alert, reloadKey]);

  // Las alertas cubren las dos pestañas; se vuelven a pedir solo cuando algo se guarda.
  useEffect(() => {
    let active = true;
    setAlerts({ status: "loading" });
    getInventoryAlerts()
      .then((result) => {
        if (active) setAlerts({ status: "ready", alerts: result });
      })
      .catch(() => {
        if (active) setAlerts({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // Cambiar la búsqueda vuelve a la primera página.
  useEffect(() => setPage(1), [q]);

  function selectTab(next: InventoryKind) {
    setKind(next);
    setPage(1);
  }

  function selectAlert(next: InventoryAlertFilter | undefined) {
    setAlert(next);
    setPage(1);
  }

  // Las flechas mueven entre pestañas, como en un tablist nativo.
  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const next = INVENTORY_TABS.find((tab) => tab.kind !== kind)?.kind ?? kind;
    selectTab(next);
    document.getElementById(tabId(next))?.focus();
  }

  const labels = KIND_LABELS[kind];

  const columns: DataTableColumn<InventoryItem>[] = [
    {
      key: "name",
      header: "Nombre",
      render: (row) => <span className="break-words">{row.name}</span>,
    },
    {
      key: "stock",
      header: "Stock",
      render: (row) => (
        <span className="whitespace-nowrap">
          {row.stock.toLocaleString("es-CO")}
          <span className="ml-1 text-sm text-subtle">
            (mín. {row.minStock.toLocaleString("es-CO")})
          </span>
        </span>
      ),
    },
    {
      key: "price",
      header: "Precio",
      render: (row) => <span className="whitespace-nowrap">{formatCop(row.price)}</span>,
    },
    {
      key: "expiresAt",
      header: "Vencimiento",
      render: (row) =>
        row.expiresAt ? (
          <span className="whitespace-nowrap">{formatDate(row.expiresAt)}</span>
        ) : (
          <span className="text-subtle">Sin vencimiento</span>
        ),
    },
    {
      key: "status",
      header: "Estado",
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {inventoryBadges(row).map((badge) => (
            <StatusBadge key={badge.label} tone={badge.tone}>
              {badge.label}
            </StatusBadge>
          ))}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Acciones",
      render: (row) => (
        <Button
          variant="secondary"
          onClick={() => setModal({ kind, item: row })}
          aria-label={`Editar ${row.name}`}
        >
          Editar
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Inventario" className="flex gap-2">
        {INVENTORY_TABS.map((tab) => {
          const selected = tab.kind === kind;
          return (
            <button
              key={tab.kind}
              id={tabId(tab.kind)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId(tab.kind)}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(tab.kind)}
              onKeyDown={handleTabKey}
              className={cn(
                "min-h-11 rounded-control border px-4 font-semibold transition-colors duration-150 ease-out",
                selected
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-field-border bg-surface text-ink hover:bg-brand-50",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        id={panelId(kind)}
        role="tabpanel"
        aria-labelledby={tabId(kind)}
        className="flex flex-col gap-6"
      >
        {alerts.status === "loading" && <LoadingState rows={1} />}
        {alerts.status === "error" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3">
            <p className="text-muted">No pudimos cargar las alertas de stock.</p>
            <Button variant="secondary" onClick={reload}>
              Reintentar
            </Button>
          </div>
        )}
        {alerts.status === "ready" && (
          <InventoryAlertsSummary
            kind={kind}
            alerts={alerts.alerts}
            filter={alert}
            onFilter={selectAlert}
          />
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="sm:min-w-64 sm:flex-1">
            <Field
              label="Buscar por nombre"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select
            label="Mostrar"
            value={alert ?? ""}
            onChange={(event) =>
              selectAlert((event.target.value || undefined) as InventoryAlertFilter | undefined)
            }
          >
            <option value="">Todos</option>
            {(Object.keys(ALERT_FILTER_LABELS) as InventoryAlertFilter[]).map((value) => (
              <option key={value} value={value}>
                {ALERT_FILTER_LABELS[value]}
              </option>
            ))}
          </Select>
          <Button onClick={() => setModal({ kind, item: null })}>
            {kind === "VACCINE" ? "Nueva vacuna" : "Nuevo medicamento"}
          </Button>
        </div>

        {list.status === "loading" && <LoadingState />}
        {list.status === "error" && <ErrorState onRetry={reload} />}
        {list.status === "ready" && list.result.data.length === 0 && (
          <EmptyState
            title={`No hay ${labels.plural}`}
            description={
              q || alert
                ? `Ningún ${labels.singular} coincide con la búsqueda o el filtro.`
                : `Aún no hay ${labels.plural} en el inventario.`
            }
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
      </div>

      <InventoryItemModal
        target={modal}
        onClose={() => setModal(null)}
        onSaved={(message, tone) => {
          setModal(null);
          show(message, tone);
          reload();
        }}
      />
    </div>
  );
}
