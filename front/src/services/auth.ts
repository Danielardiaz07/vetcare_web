import { API_REFRESH_PATH } from "@/lib/constants";
import type { LoginInput, RegisterInput } from "@/features/auth/schemas";
import { request, setAccessToken } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import { MOCK_PASSWORD, mockProfile, mockSessionUser } from "@/services/mocks/fixtures";
import type { LoginResponse, RegisterResponse, SessionUser, UserProfile } from "@/types/auth";

const UNAUTHORIZED = 401;
const MOCK_SESSION_KEY = "vetcare-mock-session";
const mockSession: LoginResponse = { accessToken: "mock-access-token", user: mockSessionUser };

// Sin API no hay cookie de refresh; la sesión de prueba se recuerda en la pestaña para sobrevivir a una recarga.
const mockSessionStore = {
  has: () => sessionStorage.getItem(MOCK_SESSION_KEY) !== null,
  save: () => sessionStorage.setItem(MOCK_SESSION_KEY, "1"),
  clear: () => sessionStorage.removeItem(MOCK_SESSION_KEY),
};

let restoreInFlight: Promise<SessionUser | null> | null = null;

function startSession(session: LoginResponse): SessionUser {
  setAccessToken(session.accessToken);
  return session.user;
}

export function register(input: RegisterInput): Promise<RegisterResponse> {
  const body = { ...input, address: input.address || undefined };
  if (isMockEnabled) {
    return mockResponse({ email: input.email, message: "Te enviamos un código a tu correo" });
  }
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body,
    skipAuthRefresh: true,
  });
}

export function verifyOtp(email: string, code: string): Promise<void> {
  if (isMockEnabled) return mockResponse(undefined);
  return request<void>("/auth/otp/verify", {
    method: "POST",
    body: { email, code },
    skipAuthRefresh: true,
  });
}

export function resendOtp(email: string): Promise<void> {
  if (isMockEnabled) return mockResponse(undefined);
  return request<void>("/auth/otp/resend", {
    method: "POST",
    body: { email },
    skipAuthRefresh: true,
  });
}

async function mockLogin({ email, password }: LoginInput): Promise<LoginResponse> {
  if (email !== mockSessionUser.email || password !== MOCK_PASSWORD) {
    return mockError(UNAUTHORIZED, "UNAUTHORIZED", "Correo o contraseña incorrectos");
  }
  const session = await mockResponse(mockSession);
  mockSessionStore.save();
  return session;
}

export async function login(input: LoginInput): Promise<SessionUser> {
  const session = isMockEnabled
    ? await mockLogin(input)
    : await request<LoginResponse>("/auth/login", {
        method: "POST",
        body: input,
        skipAuthRefresh: true,
      });
  return startSession(session);
}

export async function logout(): Promise<void> {
  try {
    if (isMockEnabled) {
      mockSessionStore.clear();
      await mockResponse(undefined);
    } else {
      await request<void>("/auth/logout", { method: "POST", skipAuthRefresh: true });
    }
  } finally {
    setAccessToken(null);
  }
}

function fetchSession(): Promise<LoginResponse | null> {
  if (isMockEnabled)
    return mockSessionStore.has() ? mockResponse(mockSession) : Promise.resolve(null);
  return request<LoginResponse>(API_REFRESH_PATH, { method: "POST", skipAuthRefresh: true });
}

// El refresh rota el token: dos llamadas en paralelo (React monta dos veces en desarrollo) invalidarían la sesión.
export function restoreSession(): Promise<SessionUser | null> {
  restoreInFlight ??= fetchSession()
    .then((session) => session && startSession(session))
    .catch(() => null)
    .finally(() => {
      restoreInFlight = null;
    });
  return restoreInFlight;
}

export function getMe(): Promise<UserProfile> {
  if (isMockEnabled) return mockResponse(mockProfile);
  return request<UserProfile>("/users/me");
}
