import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { InvoicesList } from "@/features/invoices/components/invoices-list";

export const metadata: Metadata = { title: "Facturación" };

export default function InvoicesPage() {
  return (
    <PanelPage>
      <InvoicesList />
    </PanelPage>
  );
}
