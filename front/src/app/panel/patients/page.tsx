import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";

export const metadata: Metadata = { title: "Pacientes" };

export default function PatientsPage() {
  return <PanelPage />;
}
