import { request } from "@/services/http-client";

// D-56, D-66: QR de llegada. Estas rutas no tienen datos de prueba; requieren la API real, como el QR del carné.
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

const scannerPath = (scannerToken: string) =>
  `/public/check-in/${encodeURIComponent(scannerToken)}`;

export const getCheckInCode = (appointmentId: string) =>
  request<CheckInCode>(`/me/appointments/${encodeURIComponent(appointmentId)}/check-in`, {
    cache: "no-store",
  });

// RN-85: 204 si el enlace de escaneo es válido; 404 si no lo es o está desactivado.
export const checkScannerLink = (scannerToken: string) =>
  request<void>(scannerPath(scannerToken), { auth: false, cache: "no-store" });

export const scanCheckIn = (scannerToken: string, code: string) =>
  request<CheckInScanResult>(scannerPath(scannerToken), {
    method: "POST",
    body: { code },
    auth: false,
    cache: "no-store",
  });
