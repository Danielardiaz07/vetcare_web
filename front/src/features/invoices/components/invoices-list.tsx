"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-provider";
import { VoidInvoiceDialog } from "@/features/invoices/components/void-invoice-dialog";
import { INVOICE_STATUS, PAYMENT_METHOD_LABELS } from "@/features/invoices/labels";
import { ownerFullName } from "@/features/owners/labels";
import { clinicDateOf } from "@/lib/clinic-time";
import { ROUTES } from "@/lib/constants";
import { formatCop, formatDate } from "@/lib/format";
import { listInvoices } from "@/services/invoices";
import type { Paginated } from "@/types/api";
import type { Invoice, InvoiceStatus } from "@/types/domain";

type ListState =
  { status: "loading" } | { status: "error" } | { status: "ready"; result: Paginated<Invoice> };

const ALL = "";

export function InvoicesList() {
  const { user } = useAuth();
  const { show } = useToast();
  const [status, setStatus] = useState<InvoiceStatus | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [voiding, setVoiding] = useState<Invoice | null>(null);
  // RN-74: anular es exclusivo del administrador.
  const canVoid = user?.role === "ADMIN";

  useEffect(() => {
    let active = true;
    setList({ status: "loading" });
    listInvoices({ page, status: status || undefined })
      .then((result) => {
        if (active) setList({ status: "ready", result });
      })
      .catch(() => {
        if (active) setList({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [page, status, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const columns: DataTableColumn<Invoice>[] = [
    {
      key: "number",
      header: "Número",
      render: (invoice) => (
        <span className="font-semibold whitespace-nowrap">{invoice.number}</span>
      ),
    },
    {
      key: "date",
      header: "Fecha",
      render: (invoice) => formatDate(clinicDateOf(new Date(invoice.createdAt))),
    },
    {
      key: "owner",
      header: "Propietario",
      render: (invoice) => (
        <div className="flex flex-col">
          <span>{ownerFullName(invoice.owner)}</span>
          <span className="text-subtle">{invoice.owner.documentNumber}</span>
        </div>
      ),
    },
    {
      key: "method",
      header: "Pago",
      render: (invoice) => PAYMENT_METHOD_LABELS[invoice.paymentMethod],
    },
    {
      key: "total",
      header: "Total",
      render: (invoice) => <span className="whitespace-nowrap">{formatCop(invoice.total)}</span>,
    },
    {
      key: "status",
      header: "Estado",
      render: (invoice) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tone={INVOICE_STATUS[invoice.status].tone}>
            {INVOICE_STATUS[invoice.status].label}
          </StatusBadge>
          {invoice.voidReason && <span className="text-subtle">{invoice.voidReason}</span>}
        </div>
      ),
    },
    ...(canVoid
      ? [
          {
            key: "actions",
            header: "Acciones",
            render: (invoice: Invoice) =>
              invoice.status === "PAID" && (
                <Button variant="secondary" onClick={() => setVoiding(invoice)}>
                  Anular
                </Button>
              ),
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="sm:w-56">
          <Select
            label="Estado"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as InvoiceStatus | typeof ALL);
              setPage(1);
            }}
          >
            <option value={ALL}>Todas</option>
            <option value="PAID">Pagadas</option>
            <option value="VOIDED">Anuladas</option>
          </Select>
        </div>
        <Link
          href={ROUTES.panelNewInvoice}
          className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-600 px-5 font-medium text-white transition-colors duration-150 ease-out hover:bg-brand-700"
        >
          Nueva factura
        </Link>
      </div>

      {list.status === "loading" && <LoadingState />}
      {list.status === "error" && <ErrorState onRetry={reload} />}
      {list.status === "ready" && list.result.data.length === 0 && (
        <EmptyState
          title="No hay facturas"
          description={
            status
              ? "Ninguna factura tiene ese estado."
              : "Cuando factures lo atendido, las facturas aparecerán aquí."
          }
        />
      )}
      {list.status === "ready" && list.result.data.length > 0 && (
        <>
          <DataTable
            columns={columns}
            rows={list.result.data}
            getRowKey={(invoice) => invoice.id}
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

      <VoidInvoiceDialog
        invoice={voiding}
        onClose={() => setVoiding(null)}
        onVoided={(invoice) => {
          setVoiding(null);
          show(`Factura ${invoice.number} anulada`, "success");
          reload();
        }}
      />
    </div>
  );
}
