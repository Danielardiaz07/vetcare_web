import { request } from "@/services/http-client";

export interface CheckInCode {
  appointmentId: string;
  code: string;
  qrSvg: string;
  startsAt: string;
}

export interface CheckInScanResult {
  patientName: string;
  startsAt: string;
}

export interface ScannerAccess {
  url: string;
  qrSvg: string;
}

const scannerPath = (scannerToken: string) =>
  `/public/check-in/${encodeURIComponent(scannerToken)}`;

export const CHECK_IN_CODE_MAX = 70;
const REQUEST_TIMEOUT_MS = 15_000;
const requestSignal = (signal?: AbortSignal) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
};

export const getScannerAccess = (signal?: AbortSignal) =>
  request<ScannerAccess>("/appointments/check-in/scanner-access", {
    cache: "no-store",
    signal: requestSignal(signal),
  });

export const getCheckInCode = (appointmentId: string, signal?: AbortSignal) =>
  request<CheckInCode>(`/me/appointments/${encodeURIComponent(appointmentId)}/check-in`, {
    cache: "no-store",
    signal: requestSignal(signal),
  });

export const checkScannerLink = (scannerToken: string, signal?: AbortSignal) =>
  request<void>(scannerPath(scannerToken), {
    auth: false,
    cache: "no-store",
    signal: requestSignal(signal),
  });

export const scanCheckIn = (scannerToken: string, code: string) =>
  request<CheckInScanResult>(scannerPath(scannerToken), {
    method: "POST",
    body: { code: code.trim() },
    auth: false,
    cache: "no-store",
    signal: requestSignal(),
  });
