import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PublicVaccinationCardView } from "@/features/clinical/components/public-vaccination-card";

export const metadata: Metadata = {
  title: "Verificar carné de vacunación",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function VerifyVaccinationCardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-3 font-semibold text-brand-700"
        >
          <Image src="/logo.png" alt="" width={36} height={36} />
          <span className="text-xl">VetCare</span>
        </Link>
      </header>
      <PublicVaccinationCardView key={token} token={token} />
      <footer className="text-sm text-muted">
        Esta consulta muestra únicamente nombre, especie y vacunas. No incluye datos del propietario
        ni historial clínico.
      </footer>
    </main>
  );
}
