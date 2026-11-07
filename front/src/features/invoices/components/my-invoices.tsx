"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { InvoiceDetail } from "@/features/invoices/components/invoice-detail";
import { PAYMENT_METHOD_LABELS } from "@/features/invoices/labels";
import { clinicDateOf } from "@/lib/clinic-time";
import { formatCop, formatDate } from "@/lib/format";
import { listMyInvoices } from "@/services/invoices";
import type { Paginated } from "@/types/api";
import type { Invoice } from "@/types/domain";

type ListState =
  { status: "loading" } | { status: "error" } | { status: "ready"; result: Paginated<Invoice> };

export function MyInvoices() {
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState<Invoice | null>(null);

  useEffect(() => {
    let active = true;
    setList({ status: "loading" });
    listMyInvoices(page)
      .then((result) => {
        if (active) setList({ status: "ready", result });
      })
      .catch(() => {
        if (active) setList({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [page, reloadKey]);

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
      key: "actions",
      header: "Detalle",
      render: (invoice) => (
        <Button
          variant="secondary"
          onClick={() => setSelected(invoice)}
          aria-label={`Ver la factura ${invoice.number}`}
        >
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {list.status === "loading" && <LoadingState />}
      {list.status === "error" && <ErrorState onRetry={reload} />}
      {list.status === "ready" && list.result.data.length === 0 && (
        <EmptyState
          title="Aún no tienes facturas"
          description="Cuando pagues una consulta o un servicio en la clínica, tu factura aparecerá aquí."
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

      <Modal
        open={selected !== null}
        title={selected ? `Factura ${selected.number}` : "Factura"}
        onClose={() => setSelected(null)}
        wide
      >
        {selected && (
          <>
            <InvoiceDetail invoice={selected} />
            <div className="flex justify-end print:hidden">
              <Button onClick={() => window.print()}>Imprimir</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
