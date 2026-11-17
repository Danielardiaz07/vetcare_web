import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <section className="mx-4 my-12 flex flex-col items-center gap-4 rounded-card border border-line bg-surface p-6 text-center sm:mx-auto sm:w-full sm:max-w-md sm:p-8">
          <Image src="/logo.png" alt="" width={44} height={44} />
          <p className="text-sm font-semibold text-brand-700">Error 404</p>
          <h1 className="text-2xl font-semibold text-balance text-ink">
            No encontramos esta página
          </h1>
          <p className="text-pretty text-muted">
            Puede que el enlace esté mal escrito o que la página ya no exista. Revisa la dirección o
            vuelve al inicio.
          </p>
          <Link
            href={ROUTES.home}
            className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-600 px-5 font-medium text-white transition-colors duration-150 ease-out hover:bg-brand-700"
          >
            Volver al inicio
          </Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
