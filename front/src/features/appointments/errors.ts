import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { ApiError } from "@/services/http-client";

// La API responde 409 tanto por la franja tomada (RN-27) como por el límite de citas (RN-24)
// o el plazo para cambios (RN-28); solo el mensaje los distingue.
export const isSlotTaken = (error: unknown) =>
  error instanceof ApiError && error.message.includes("franja ya no");

export const isActiveLimit = (error: unknown) =>
  error instanceof ApiError && error.message.includes("citas activas");

export const appointmentErrorMessage = (error: unknown) =>
  isNetworkError(error) || !(error instanceof ApiError) ? NETWORK_ERROR_MESSAGE : error.message;

export const SLOT_TAKEN_MESSAGE = "La franja ya no está disponible. Elige otra hora.";
export const CONTACT_CLINIC_MESSAGE = "Para cambios, comunícate con la clínica";
