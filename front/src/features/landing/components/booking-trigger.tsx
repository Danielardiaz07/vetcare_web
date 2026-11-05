"use client";

import type { ReactNode } from "react";
import { useLandingBooking } from "@/features/landing/booking-context";
import type { AppointmentType } from "@/types/domain";

type BookingTriggerProps = {
  type?: AppointmentType;
  className?: string;
  children: ReactNode;
};

export function BookingTrigger({ type, className, children }: BookingTriggerProps) {
  const { requestBooking } = useLandingBooking();
  return (
    <button type="button" onClick={() => requestBooking(type)} className={className}>
      {children}
    </button>
  );
}
