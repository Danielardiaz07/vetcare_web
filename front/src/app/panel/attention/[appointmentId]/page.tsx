import type { Metadata } from "next";
import { PanelPage } from "@/components/layout/panel-page";
import { AttentionView } from "@/features/clinical/components/attention-view";
import { clinicDateOf } from "@/lib/clinic-time";

export const metadata: Metadata = { title: "Atención" };

const CLINIC_DATE = /^\d{4}-\d{2}-\d{2}$/;

type AppointmentAttentionPageProps = {
  params: Promise<{ appointmentId: string }>;
  searchParams: Promise<{ date?: string }>;
};

// RN-43 y RN-44: la vista comprueba que la cita sea del veterinario y esté Confirmada.
export default async function AppointmentAttentionPage({
  params,
  searchParams,
}: AppointmentAttentionPageProps) {
  const [{ appointmentId }, { date }] = await Promise.all([params, searchParams]);
  return (
    <PanelPage>
      <AttentionView
        appointmentId={appointmentId}
        date={date && CLINIC_DATE.test(date) ? date : clinicDateOf(new Date())}
      />
    </PanelPage>
  );
}
