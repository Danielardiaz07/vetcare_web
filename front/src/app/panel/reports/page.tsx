import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { Dashboard } from "@/features/reports/components/dashboard";

export const metadata: Metadata = { title: "Indicadores" };

export default function ReportsPage() {
  return (
    <PanelPage>
      <Dashboard />
    </PanelPage>
  );
}
