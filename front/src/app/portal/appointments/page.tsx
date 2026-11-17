import type { Metadata } from "next";
import { MyAppointments } from "@/features/appointments/components/my-appointments";

export const metadata: Metadata = { title: "Mis citas" };

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string | string[] }>;
}) {
  const { appointmentId } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">Mis citas</h1>
        <p className="text-muted">Tus citas próximas y las anteriores, de todas tus mascotas.</p>
      </div>
      <MyAppointments
        appointmentId={typeof appointmentId === "string" ? appointmentId : undefined}
      />
    </div>
  );
}
