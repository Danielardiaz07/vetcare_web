import type { Metadata } from "next";
import { AppointmentWizard } from "@/features/appointments/components/appointment-wizard";

export const metadata: Metadata = { title: "Agendar cita" };

type NewAppointmentPageProps = {
  searchParams: Promise<{ petId?: string | string[]; type?: string | string[] }>;
};

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function NewAppointmentPage({ searchParams }: NewAppointmentPageProps) {
  const { petId, type } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Agendar cita</h1>
        <p className="text-muted">
          Elige mascota, tipo de cita, profesional (o cualquiera disponible), día y hora.
        </p>
      </div>
      <AppointmentWizard initialPetId={single(petId)} initialType={single(type)} />
    </div>
  );
}
