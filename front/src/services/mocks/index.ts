import { env } from "@/lib/env";
import { ApiError } from "@/services/http-client";

const DELAY_MS = 300;
const SLOW_DELAY_MS = 3000;
const SERVICE_UNAVAILABLE = 503;

export const isMockEnabled = env.NEXT_PUBLIC_USE_MOCKS;
export const isNewAccount = env.NEXT_PUBLIC_MOCK_SCENARIO === "new-account";

export const mockDelay = () =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, env.NEXT_PUBLIC_MOCK_SCENARIO === "slow" ? SLOW_DELAY_MS : DELAY_MS),
  );

export async function mockError(
  status = SERVICE_UNAVAILABLE,
  code = "NETWORK_ERROR",
  message = "No pudimos cargar tus datos. Revisa tu conexión e intenta de nuevo.",
): Promise<never> {
  await mockDelay();
  throw new ApiError(status, code, message);
}

// Copia los datos para que una pantalla no pueda modificar los fixtures compartidos.
export async function mockResponse<T>(data: T): Promise<T> {
  if (env.NEXT_PUBLIC_MOCK_SCENARIO === "network-error") return mockError();
  await mockDelay();
  return structuredClone(data);
}
