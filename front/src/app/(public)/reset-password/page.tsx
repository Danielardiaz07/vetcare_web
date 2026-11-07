import type { Metadata } from "next";
import Image from "next/image";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

// D-31: el enlace del correo llega aquí con ?token=.
export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <section className="mx-4 my-8 flex flex-col gap-6 rounded-card border border-line bg-surface p-6 sm:mx-auto sm:w-full sm:max-w-md sm:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/logo.png" alt="" width={44} height={44} priority />
        <h1 className="text-2xl font-semibold text-ink">Crea tu contraseña nueva</h1>
        <p className="text-muted">Al guardarla se cerrarán las sesiones abiertas de tu cuenta.</p>
      </div>
      <ResetPasswordForm token={typeof token === "string" && token ? token : null} />
    </section>
  );
}
