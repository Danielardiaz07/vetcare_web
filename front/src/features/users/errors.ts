import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { ApiError } from "@/services/http-client";

export function userErrorMessage(error: unknown): string {
  if (isNetworkError(error) || !(error instanceof ApiError)) return NETWORK_ERROR_MESSAGE;
  return error.message;
}
