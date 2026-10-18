import { ApiError } from "@/services/http-client";

export const NETWORK_ERROR_MESSAGE = "No pudimos conectarnos, intenta de nuevo";

// fetch lanza TypeError cuando no hay conexión; los datos de prueba lo simulan con NETWORK_ERROR.
export const isNetworkError = (error: unknown) =>
  !(error instanceof ApiError) || error.code === "NETWORK_ERROR";
