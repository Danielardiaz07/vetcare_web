"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import { useAuthDialog } from "@/features/auth/components/auth-dialog";
import { BOOKING_SECTION_ID } from "@/features/landing/content";
import type { AppointmentType } from "@/types/domain";

const BOOKING_REASONS = {
  login: "Inicia sesión para agendar tu cita",
  register: "Crea tu cuenta para agendar tu cita",
} as const;

type LandingBookingContextValue = {
  type: AppointmentType | null;
  requestBooking: (type?: AppointmentType) => void;
  openLogin: (tab?: "login" | "register") => void;
};

const LandingBookingContext = createContext<LandingBookingContextValue | null>(null);

function scrollToBooking() {
  // El asistente aparece después de entrar; se espera un cuadro para bajar con la altura ya nueva.
  requestAnimationFrame(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(BOOKING_SECTION_ID)
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
}

export function LandingBookingProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const { open } = useAuthDialog();
  const [type, setType] = useState<AppointmentType | null>(null);

  const openLogin = useCallback(
    (tab: "login" | "register" = "login") => open(BOOKING_REASONS[tab], tab, scrollToBooking),
    [open],
  );

  const requestBooking = useCallback(
    (nextType?: AppointmentType) => {
      if (nextType) setType(nextType);
      scrollToBooking();
      if (status === "anonymous") openLogin();
    },
    [status, openLogin],
  );

  const value = useMemo(
    () => ({ type, requestBooking, openLogin }),
    [type, requestBooking, openLogin],
  );

  return <LandingBookingContext.Provider value={value}>{children}</LandingBookingContext.Provider>;
}

export function useLandingBooking(): LandingBookingContextValue {
  const context = useContext(LandingBookingContext);
  if (!context) {
    throw new Error("useLandingBooking debe usarse dentro de LandingBookingProvider");
  }
  return context;
}
