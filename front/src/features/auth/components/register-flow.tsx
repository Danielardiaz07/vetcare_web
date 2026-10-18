"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { OtpForm } from "@/features/auth/components/otp-form";
import { RegisterForm } from "@/features/auth/components/register-form";
import { ROUTES } from "@/lib/constants";

type Credentials = { email: string; password: string };

type RegisterFlowProps = {
  onGoToLogin?: () => void;
  onDone?: () => void;
};

export function RegisterFlow({ onGoToLogin, onDone }: RegisterFlowProps) {
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
      if (credentials) await signIn(credentials.email, credentials.password);
      router.push(ROUTES.portal);
    } catch {
      router.push(ROUTES.login);
    } finally {
      onDone?.();
    }
  }

  if (email) return <OtpForm email={email} onVerified={handleVerified} />;
  return <RegisterForm onRegistered={handleRegistered} onGoToLogin={onGoToLogin} />;
}
