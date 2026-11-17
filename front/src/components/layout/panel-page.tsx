"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/features/auth/auth-provider";
import { ROUTES } from "@/lib/constants";
import { isStaffRole, panelItemFor } from "@/lib/panel-menu";

type PanelPageProps = {
  children?: ReactNode;
};

// RN-13: si la sección no está en el menú del rol, se vuelve a /panel. La API vuelve a comprobarlo.
export function PanelPage({ children }: PanelPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const item = user && isStaffRole(user.role) ? panelItemFor(user.role, pathname) : undefined;

  useEffect(() => {
    if (user && !item) router.replace(ROUTES.panel);
  }, [user, item, router]);

  if (!item) return <LoadingState />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-ink">{item.label}</h1>
      {children}
    </div>
  );
}
