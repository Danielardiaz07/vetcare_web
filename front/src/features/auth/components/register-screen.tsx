"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/features/auth/auth-provider";
import { RegisterFlow } from "@/features/auth/components/register-flow";
import { homeRouteFor } from "@/features/auth/redirects";

export function RegisterScreen() {
  const router = useRouter();
  const { user, status } = useAuth();

  useEffect(() => {
    if (user) router.replace(homeRouteFor(user.role));
  }, [user, router]);

  if (status !== "anonymous") return <LoadingState rows={1} />;
  return <RegisterFlow />;
}
