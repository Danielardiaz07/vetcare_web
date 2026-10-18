import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginScreen } from "@/features/auth/components/login-screen";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Iniciar sesión" };

type LoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-card border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image src="/logo.png" alt="" width={44} height={44} priority />
        <h1 className="text-2xl font-semibold text-ink">Inicia sesión</h1>
        <p className="text-muted">
          Entra a tu portal: citas, historial clínico de tus mascotas y facturas.
        </p>
      </div>
      <LoginScreen next={typeof next === "string" ? next : undefined} />
      <p className="text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href={ROUTES.register} className="font-semibold text-brand-700 underline">
          Crea una
        </Link>
      </p>
    </section>
  );
}
