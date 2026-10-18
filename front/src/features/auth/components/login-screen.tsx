"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/features/auth/auth-provider";
import { LoginForm } from "@/features/auth/components/login-form";
import { homeRouteFor, safeNextPath } from "@/features/auth/redirects";

type LoginScreenProps = {
  next?: string;
};

export function LoginScreen({ next }: LoginScreenProps) {
  const router = useRouter();
  const { user, status } = useAuth();

  // Cubre las dos entradas: llegar con sesión ya abierta e iniciarla en el formulario.
  useEffect(() => {
    if (user) router.replace(safeNextPath(next) ?? homeRouteFor(user.role));
  }, [user, next, router]);

  if (status !== "anonymous") return <LoadingState rows={1} />;
  return <LoginForm />;
}
