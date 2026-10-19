import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { ApiError } from "@/services/http-client";

const CONFLICT = 409;

export const isConflict = (error: unknown) =>
  error instanceof ApiError && error.status === CONFLICT;

export function invoiceErrorMessage(error: unknown): string {
  if (isNetworkError(error) || !(error instanceof ApiError)) return NETWORK_ERROR_MESSAGE;
  return error.message;
}
