"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useAuthDialog, type SignedInHandler } from "@/features/auth/components/auth-dialog";
import { BOOKING_SECTION_ID } from "@/features/landing/content";
import type { AppointmentType } from "@/types/domain";

const BOOKING_REASONS = {
  login: "Inicia sesión para agendar tu cita",
  register: "Crea tu cuenta para agendar tu cita",
} as const;

type LandingBookingContextValue = {
  type: AppointmentType | null;
  requestKey: number;
  requestBooking: (type?: AppointmentType) => void;
  openLogin: (tab?: "login" | "register", onSignedIn?: SignedInHandler) => void;
};

const LandingBookingContext = createContext<LandingBookingContextValue | null>(null);

function scrollToBooking() {
  requestAnimationFrame(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById(BOOKING_SECTION_ID)
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
}

export function LandingBookingProvider({ children }: { children: ReactNode }) {
  const { open } = useAuthDialog();
  const [type, setType] = useState<AppointmentType | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const openLogin = useCallback(
    (tab: "login" | "register" = "login", onSignedIn?: SignedInHandler) =>
      open(BOOKING_REASONS[tab], tab, (user) => {
        onSignedIn?.(user);
        scrollToBooking();
      }),
    [open],
  );

  const requestBooking = useCallback((nextType?: AppointmentType) => {
    if (nextType) {
      setType(nextType);
      setRequestKey((key) => key + 1);
    }
    scrollToBooking();
  }, []);

  const value = useMemo(
    () => ({ type, requestKey, requestBooking, openLogin }),
    [type, requestKey, requestBooking, openLogin],
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
