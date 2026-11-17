"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { PortalSideMenu } from "@/components/layout/portal-side-menu";
import { PortalTopBar } from "@/components/layout/portal-top-bar";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/features/auth/auth-provider";
import { ROUTES } from "@/lib/constants";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, signOut } = useAuth();
  // Al cerrar sesión se va a la portada; sin esta marca el portal mandaría primero a /login.
  const signingOut = useRef(false);

  useEffect(() => {
    if (signingOut.current) return;
    if (status === "anonymous") {
      router.replace(`${ROUTES.login}?next=${encodeURIComponent(pathname)}`);
    } else if (user && user.role !== "OWNER") {
      router.replace(ROUTES.panel);
    }
  }, [status, user, pathname, router]);

  async function handleSignOut() {
    signingOut.current = true;
    await signOut();
    router.replace(ROUTES.home);
  }

  if (status !== "authenticated" || user?.role !== "OWNER") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <LoadingState />
      </div>
    );
  }

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2"
      >
        Saltar al contenido
      </a>
      <PortalTopBar onSignOut={handleSignOut} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 pt-6 pb-24 sm:px-6 md:pb-8">
        <PortalSideMenu />
        <main id="contenido" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </>
  );
}
