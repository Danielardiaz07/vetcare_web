"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { useAuth } from "@/features/auth/auth-provider";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { LoginForm } from "@/features/auth/components/login-form";
import { homeRouteFor, safeNextPath } from "@/features/auth/redirects";

type LoginScreenProps = {
  next?: string;
  recover?: boolean;
};

export function LoginScreen({ next, recover = false }: LoginScreenProps) {
  const router = useRouter();
  const { user, status } = useAuth();
  const [recovering, setRecovering] = useState(recover);

  // Cubre las dos entradas: llegar con sesión ya abierta e iniciarla en el formulario.
  useEffect(() => {
    if (user) router.replace(safeNextPath(next) ?? homeRouteFor(user.role));
  }, [user, next, router]);

  if (status !== "anonymous") return <LoadingState rows={1} />;
  if (recovering) return <ForgotPasswordForm onBack={() => setRecovering(false)} />;
  return <LoginForm onForgotPassword={() => setRecovering(true)} />;
}
