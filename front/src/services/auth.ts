import { API_REFRESH_PATH } from "@/lib/constants";
import type { LoginInput, RegisterInput } from "@/features/auth/schemas";
import { request, setAccessToken } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import {
  MOCK_OTP_CODE,
  MOCK_PASSWORD,
  mockOwner,
  mockProfile,
  mockSessionUser,
  mockStaffUsers,
  mockUnlinkedOwner,
} from "@/services/mocks/fixtures";
import type { LoginResponse, RegisterResponse, SessionUser, UserProfile } from "@/types/auth";

const UNAUTHORIZED = 401;
const CONFLICT = 409;
const UNPROCESSABLE_ENTITY = 422;
const MOCK_SESSION_KEY = "vetcare-mock-session";
const MOCK_ACCESS_TOKEN = "mock-access-token";

// Sin API no hay cookie de refresh; la sesión de prueba se recuerda en la pestaña para sobrevivir a una recarga.
const mockSessionStore = {
  email: () => sessionStorage.getItem(MOCK_SESSION_KEY),
  save: (email: string) => sessionStorage.setItem(MOCK_SESSION_KEY, email),
  clear: () => sessionStorage.removeItem(MOCK_SESSION_KEY),
};

// Cuentas creadas con el registro de prueba; viven solo mientras la pestaña está abierta.
const mockAccounts = new Map<string, string>();

let mockCurrentUser: SessionUser | null = null;

function findMockUser(email: string): SessionUser | undefined {
  if (email === mockSessionUser.email || mockAccounts.has(email)) {
    return { ...mockSessionUser, email };
  }
  return mockStaffUsers.find((user) => user.email === email);
}

const mockPasswordFor = (email: string) => mockAccounts.get(email) ?? MOCK_PASSWORD;

function mockSessionOf(user: SessionUser): Promise<LoginResponse> {
  mockCurrentUser = user;
  mockSessionStore.save(user.email);
  return mockResponse({ accessToken: MOCK_ACCESS_TOKEN, user });
}

let restoreInFlight: Promise<SessionUser | null> | null = null;

function startSession(session: LoginResponse): SessionUser {
  setAccessToken(session.accessToken);
  return session.user;
}

// Repite las comprobaciones de la API (RN-04, D-17, D-18) para poder ver cada mensaje sin backend.
async function mockRegister(input: RegisterInput): Promise<RegisterResponse> {
  const { email, documentNumber, password } = input;
  if (email === mockOwner.email || mockAccounts.has(email)) {
    return mockError(CONFLICT, "CONFLICT", "El correo ya esta registrado");
  }
  if (documentNumber === mockOwner.documentNumber) {
    return mockError(CONFLICT, "CONFLICT", "La cedula ya tiene una cuenta registrada");
  }
  if (documentNumber === mockUnlinkedOwner.documentNumber && email !== mockUnlinkedOwner.email) {
    return mockError(
      CONFLICT,
      "CONFLICT",
      "La cedula ya esta registrada en la clinica con otro correo. Acercate a recepcion para actualizarlo",
    );
  }
  const response = await mockResponse({
    email,
    message: "Te enviamos un codigo de verificacion a tu correo",
  });
  mockAccounts.set(email, password);
  return response;
}

export function register(input: RegisterInput): Promise<RegisterResponse> {
  const body = { ...input, address: input.address || undefined };
  if (isMockEnabled) return mockRegister(input);
  return request<RegisterResponse>("/auth/register", {
    method: "POST",
    body,
    skipAuthRefresh: true,
  });
}

export function verifyOtp(email: string, code: string): Promise<void> {
  if (isMockEnabled) {
    return code === MOCK_OTP_CODE
      ? mockResponse(undefined)
      : mockError(UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Codigo invalido o expirado");
  }
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

function mockLogin({ email, password }: LoginInput): Promise<LoginResponse> {
  const user = findMockUser(email);
  if (!user || password !== mockPasswordFor(email)) {
    return mockError(UNAUTHORIZED, "UNAUTHORIZED", "Correo o contraseña incorrectos");
  }
  return mockSessionOf(user);
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
      mockCurrentUser = null;
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
  if (isMockEnabled) {
    const email = mockSessionStore.email();
    const user = email ? findMockUser(email) : undefined;
    return user ? mockSessionOf(user) : Promise.resolve(null);
  }
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

function mockProfileOf({ id, email, role }: SessionUser): UserProfile {
  if (role === "OWNER") return { ...mockProfile, id, email };
  return { id, email, role, status: "ACTIVE", owner: null };
}

export function getMe(): Promise<UserProfile> {
  if (isMockEnabled) return mockResponse(mockProfileOf(mockCurrentUser ?? mockSessionUser));
  return request<UserProfile>("/users/me");
}
