import { ApiError, request } from "@/services/http-client";
import type { Species, VaccineStatus } from "@/types/domain";

export type CardVerificationLink = { active: false } | { active: true; url: string; qrSvg: string };

export interface PublicVaccinationCard {
  clinic: string;
  patient: { name: string; species: Species };
  status: VaccineStatus | "NO_RECORDS";
  vaccines: {
    name: string;
    appliedAt: string;
    nextDoseAt: string | null;
    status: VaccineStatus;
  }[];
  verifiedAt: string;
}

const cardPath = (patientId: string, staff = false) =>
  `${staff ? "/patients" : "/me/patients"}/${encodeURIComponent(patientId)}/vaccination-card/verification`;

const REQUEST_TIMEOUT_MS = 15_000;
const requestSignal = (signal?: AbortSignal) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
};

export function getCardVerification(patientId: string, staff = false, signal?: AbortSignal) {
  return request<CardVerificationLink>(cardPath(patientId, staff), {
    cache: "no-store",
    signal: requestSignal(signal),
  });
}

export function rotateCardVerification(patientId: string) {
  return request<CardVerificationLink>(`${cardPath(patientId)}/rotate`, {
    method: "POST",
    signal: requestSignal(),
  });
}

export function disableCardVerification(patientId: string) {
  return request<void>(cardPath(patientId), { method: "DELETE", signal: requestSignal() });
}

export async function getPublicVaccinationCard(token: string, signal?: AbortSignal) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new ApiError(404, "NOT_FOUND", "Carné no disponible");
  }
  return request<PublicVaccinationCard>(`/public/vaccination-cards/${token}`, {
    auth: false,
    cache: "no-store",
    signal: requestSignal(signal),
  });
}
