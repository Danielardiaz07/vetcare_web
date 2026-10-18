import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";

export const metadata: Metadata = { title: "Facturación" };

export default function InvoicesPage() {
  return <PanelPage />;
}
