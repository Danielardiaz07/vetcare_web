import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function HomePage() {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6 sm:p-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        El cuidado de tu mascota, en un solo lugar
      </h1>
      <p className="mt-3 max-w-prose text-muted">
        Agenda citas, consulta el historial clínico y el carné de vacunación, y revisa tus facturas
        desde cualquier dispositivo.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href={ROUTES.login}
          className="rounded-lg bg-brand-600 px-5 py-2.5 text-center font-medium text-white hover:bg-brand-700"
        >
          Iniciar sesión
        </Link>
        <Link
          href={ROUTES.register}
          className="rounded-lg border border-line px-5 py-2.5 text-center font-medium hover:bg-brand-50"
        >
          Crear cuenta
        </Link>
      </div>
    </section>
  );
}
