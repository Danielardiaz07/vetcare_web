import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { AgendaView } from "@/features/agenda/components/agenda-view";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return (
    <PanelPage>
      <AgendaView />
    </PanelPage>
  );
}
