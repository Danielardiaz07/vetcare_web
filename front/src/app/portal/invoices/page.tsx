import type { Metadata } from "next";
import { MyInvoices } from "@/features/invoices/components/my-invoices";

export const metadata: Metadata = { title: "Facturas" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ invoiceId?: string | string[] }>;
}) {
  const { invoiceId } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Facturas</h1>
        <p className="text-muted">Tus facturas pagadas en la clínica, con su detalle.</p>
      </div>
      <MyInvoices invoiceId={typeof invoiceId === "string" ? invoiceId : undefined} />
    </div>
  );
}
