"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

// Sin encabezado ni menú: si lo que falló fue uno de ellos, esta pantalla debe poder mostrarse igual.
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <section
        role="alert"
        className="flex w-full max-w-md flex-col items-center gap-4 rounded-card border border-line bg-surface p-6 text-center sm:p-8"
      >
        <Image src="/logo.png" alt="" width={44} height={44} />
        <h1 className="text-2xl font-semibold text-balance text-ink">Algo salió mal</h1>
        <p className="text-pretty text-muted">
          No pudimos mostrar esta pantalla. Intenta de nuevo y, si sigue fallando, vuelve al inicio
          y entra otra vez en unos minutos.
        </p>
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset}>Reintentar</Button>
          <Link
            href={ROUTES.home}
            className="inline-flex min-h-11 items-center justify-center rounded-control border border-field-border bg-surface px-5 font-medium text-ink transition-colors duration-150 ease-out hover:bg-brand-50"
          >
            Volver al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
