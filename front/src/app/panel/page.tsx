"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/features/auth/auth-provider";
import { isStaffRole, PANEL_MENU } from "@/lib/panel-menu";

export default function PanelHomePage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !isStaffRole(user.role)) return;
    const firstItem = PANEL_MENU[user.role][0];
    if (firstItem) router.replace(firstItem.href);
  }, [user, router]);

  return <LoadingState />;
}
