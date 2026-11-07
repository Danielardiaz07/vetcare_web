import Image from "next/image";
import { PAYMENT_METHOD_LABELS } from "@/features/invoices/labels";
import { ownerFullName } from "@/features/owners/labels";
import { clinicDateOf } from "@/lib/clinic-time";
import { IVA_RATE_PERCENT } from "@/lib/constants";
import { formatCop, formatDate } from "@/lib/format";
import type { Invoice } from "@/types/domain";

// RN-71: los valores se muestran tal como los calculó la API, sin recalcularlos aquí.
export function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  return (
    <div className="invoice-print flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="" width={44} height={44} />
          <div className="flex flex-col">
            <span className="font-semibold">VetCare</span>
            <span className="text-sm text-muted">Factura de venta</span>
          </div>
        </div>
        <div className="flex flex-col items-end text-right">
          <span className="font-semibold">{invoice.number}</span>
          <span className="text-sm text-muted">
            {formatDate(clinicDateOf(new Date(invoice.createdAt)))}
          </span>
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 rounded-card border border-line bg-canvas p-4 text-sm sm:grid-cols-2">
        <div className="flex flex-col">
          <dt className="text-subtle">Cliente</dt>
          <dd className="text-ink">{ownerFullName(invoice.owner)}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-subtle">Documento</dt>
          <dd className="text-ink">{invoice.owner.documentNumber}</dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-subtle">Método de pago</dt>
          <dd className="text-ink">{PAYMENT_METHOD_LABELS[invoice.paymentMethod]}</dd>
        </div>
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Conceptos de la factura</caption>
          <thead className="border-b border-line text-subtle">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                Concepto
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Valor
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                IVA
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-divider">
                <td className="py-2 pr-4 text-ink">{item.description}</td>
                <td className="py-2 pr-4 text-right whitespace-nowrap text-ink">
                  {formatCop(item.amount)}
                </td>
                <td className="py-2 text-right whitespace-nowrap text-ink">
                  {item.taxed ? formatCop(item.tax) : "Exento"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="ml-auto flex w-full max-w-64 flex-col gap-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-ink">{formatCop(invoice.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">IVA {IVA_RATE_PERCENT} %</dt>
          <dd className="text-ink">{formatCop(invoice.tax)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-line pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatCop(invoice.total)}</dd>
        </div>
      </dl>
    </div>
  );
}
