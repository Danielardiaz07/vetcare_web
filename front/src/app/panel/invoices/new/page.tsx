import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { NewInvoice } from "@/features/invoices/components/new-invoice";

export const metadata: Metadata = { title: "Nueva factura" };

export default function NewInvoicePage() {
  return (
    <PanelPage>
      <NewInvoice />
    </PanelPage>
  );
}
