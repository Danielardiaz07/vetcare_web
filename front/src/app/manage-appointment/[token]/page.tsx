import type { Metadata } from "next";
import Image from "next/image";
import { ManageAppointment } from "@/features/appointments/components/manage-appointment";

export const metadata: Metadata = {
  title: "Gestionar cita",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ManageAppointmentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center gap-3 font-semibold text-brand-700">
        <Image src="/logo.png" alt="" width={36} height={36} />
        <span className="text-xl">VetCare</span>
      </header>
      <ManageAppointment key={token} token={token} />
    </main>
  );
}
