import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return <PanelPage />;
}
