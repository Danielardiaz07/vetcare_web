import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RegisterScreen } from "@/features/auth/components/register-screen";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <section className="mx-auto flex w-full max-w-xl flex-col gap-6 rounded-card border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/logo.png" alt="" width={44} height={44} priority />
        <h1 className="text-2xl font-semibold text-ink">Crea tu cuenta</h1>
        <p className="text-muted">
          Con tu cuenta agendas citas y consultas el historial de tus mascotas y tus facturas.
        </p>
      </div>
      <RegisterScreen />
      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href={ROUTES.login} className="font-semibold text-brand-700 underline">
          Inicia sesión
        </Link>
      </p>
    </section>
  );
}
