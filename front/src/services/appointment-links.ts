import { request } from "@/services/http-client";
import type { AvailabilityParams } from "@/services/appointments";
import type { Appointment, Availability } from "@/types/domain";

export interface ManagedAppointment {
  appointment: Appointment;
  canChange: boolean;
  blockedReason: string | null;
}

const linkPath = (token: string) => `/public/appointments/manage/${encodeURIComponent(token)}`;
const signalWithTimeout = (signal?: AbortSignal) => {
  const timeout = AbortSignal.timeout(15_000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
};

export const getManagedAppointment = (token: string, signal?: AbortSignal) =>
  request<ManagedAppointment>(linkPath(token), {
    auth: false,
    cache: "no-store",
    signal: signalWithTimeout(signal),
  });

export const getManagedAvailability = (params: AvailabilityParams) =>
  request<Availability>("/appointments/availability", {
    query: { ...params },
    auth: false,
    cache: "no-store",
    signal: signalWithTimeout(),
  });

export const rescheduleManagedAppointment = (token: string, startsAt: string) =>
  request<ManagedAppointment>(`${linkPath(token)}/reschedule`, {
    method: "POST",
    body: { startsAt },
    auth: false,
    cache: "no-store",
    signal: signalWithTimeout(),
  });

export const cancelManagedAppointment = (token: string, reason: string) =>
  request<ManagedAppointment>(`${linkPath(token)}/cancel`, {
    method: "POST",
    body: reason.trim() ? { reason: reason.trim() } : {},
    auth: false,
    cache: "no-store",
    signal: signalWithTimeout(),
  });
