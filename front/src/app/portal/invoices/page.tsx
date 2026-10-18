import type { Metadata } from "next";

export const metadata: Metadata = { title: "Facturas" };

export default function InvoicesPage() {
  return <h1 className="text-2xl font-semibold text-ink">Facturas</h1>;
}
