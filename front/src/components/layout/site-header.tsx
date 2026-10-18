import Image from "next/image";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href={ROUTES.home}
          className="flex items-center gap-2 text-lg font-semibold text-brand-700"
        >
          <Image src="/logo.png" alt="" width={44} height={44} priority />
          VetCare
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-4 text-sm">
          <Link href={ROUTES.login} className="text-muted hover:text-ink">
            Iniciar sesión
          </Link>
          <Link
            href={ROUTES.register}
            className="rounded-lg bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
          >
            Registrarse
          </Link>
        </nav>
      </div>
    </header>
  );
}
