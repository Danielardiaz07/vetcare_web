import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { PatientRecord } from "@/features/patients/components/patient-record";

export const metadata: Metadata = { title: "Paciente" };

type PatientPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PatientPage({ params }: PatientPageProps) {
  const { id } = await params;
  return (
    <PanelPage>
      <PatientRecord patientId={id} />
    </PanelPage>
  );
}
