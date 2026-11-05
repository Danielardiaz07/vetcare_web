"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { OtpForm } from "@/features/auth/components/otp-form";
import { RegisterForm } from "@/features/auth/components/register-form";
import { ROUTES } from "@/lib/constants";
import type { SessionUser } from "@/types/auth";

type Credentials = { email: string; password: string };

type RegisterFlowProps = {
  onGoToLogin?: () => void;
  onDone?: () => void;
  // Si está, la persona sigue en la página donde abrió la ventana en lugar de ir al portal.
  onSignedIn?: (user: SessionUser) => void;
};

export function RegisterFlow({ onGoToLogin, onDone, onSignedIn }: RegisterFlowProps) {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  // La verificación no abre sesión: se entra con lo que la persona acaba de escribir, sin guardarlo en el navegador.
  const credentialsRef = useRef<Credentials | null>(null);

  function handleRegistered(registeredEmail: string, password: string) {
    credentialsRef.current = { email: registeredEmail, password };
    setEmail(registeredEmail);
  }

  async function handleVerified() {
    const credentials = credentialsRef.current;
    credentialsRef.current = null;
    try {
      const user = credentials ? await signIn(credentials.email, credentials.password) : null;
      if (user && onSignedIn) onSignedIn(user);
      else router.push(ROUTES.portal);
    } catch {
      router.push(ROUTES.login);
    } finally {
      onDone?.();
    }
  }

  if (email) return <OtpForm email={email} onVerified={handleVerified} />;
  return <RegisterForm onRegistered={handleRegistered} onGoToLogin={onGoToLogin} />;
}
