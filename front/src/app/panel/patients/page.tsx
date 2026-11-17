import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { PatientsList } from "@/features/patients/components/patients-list";

export const metadata: Metadata = { title: "Pacientes" };

export default function PatientsPage() {
  return (
    <PanelPage>
      <PatientsList />
    </PanelPage>
  );
}
