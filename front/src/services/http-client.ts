import { API_REFRESH_PATH } from "@/lib/constants";
import { env } from "@/lib/env";
import type { ApiErrorBody } from "@/types/api";

const UNAUTHORIZED = 401;
const NO_CONTENT = 204;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  skipAuthRefresh?: boolean;
}

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return new ApiError(
    response.status,
    body?.error.code ?? "UNKNOWN_ERROR",
    body?.error.message ?? "Ocurrió un error inesperado. Intenta de nuevo.",
    body?.error.details ?? [],
  );
}

function send(path: string, options: RequestOptions): Promise<Response> {
  const headers = new Headers();
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "include",
  });
}

// Las peticiones concurrentes que reciben 401 comparten un único refresh (el token rota).
function refreshSession(): Promise<boolean> {
  refreshInFlight ??= send(API_REFRESH_PATH, { method: "POST" })
    .then(async (response) => {
      if (!response.ok) return false;
      const body = (await response.json()) as { accessToken: string };
      setAccessToken(body.accessToken);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options);

  if (response.status === UNAUTHORIZED && !options.skipAuthRefresh) {
    if (await refreshSession()) {
      response = await send(path, options);
    } else {
      setAccessToken(null);
    }
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === NO_CONTENT) return undefined as T;
  return (await response.json()) as T;
}
