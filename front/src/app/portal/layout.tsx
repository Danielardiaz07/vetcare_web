"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { PortalTopBar } from "@/components/layout/portal-top-bar";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/features/auth/auth-provider";
import { ROUTES } from "@/lib/constants";

export default function PortalLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, signOut } = useAuth();
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
      <main
        id="contenido"
        tabIndex={-1}
        className="mx-auto w-full min-w-0 max-w-6xl flex-1 scroll-mt-24 px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-8 lg:pl-[calc(var(--spacing)*6+var(--spacing-section-content))] lg:print:pl-6"
      >
        {children}
      </main>
    </>
  );
}
