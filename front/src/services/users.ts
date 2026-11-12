import { request } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import { MOCK_PASSWORD, mockProfile, mockStaffAccounts } from "@/services/mocks/fixtures";
import type { Paginated } from "@/types/api";
import type { ChangePasswordInput } from "@/features/auth/schemas";
import type { StaffUser, UserProfile, UserStatus } from "@/types/auth";

const NOT_FOUND = 404;
const CONFLICT = 409;
const UNPROCESSABLE_ENTITY = 422;

type StaffRole = StaffUser["role"];
type ManageableStatus = Exclude<UserStatus, "PENDING">;

export interface ListUsersParams {
  page: number;
  limit: number;
  role?: StaffRole;
  status?: ManageableStatus;
  q?: string;
}

export interface CreateUserInput {
  email: string;
  role: StaffRole;
  password: string;
}

export type UpdateUserInput = Partial<{
  role: StaffRole;
  status: ManageableStatus;
  password: string;
}>;

// Los cambios de prueba viven mientras la pestaña está abierta.
const mockAccounts = structuredClone(mockStaffAccounts);

function mockList({
  page,
  limit,
  role,
  status,
  q,
}: ListUsersParams): Promise<Paginated<StaffUser>> {
  const search = q?.toLowerCase();
  const matches = mockAccounts
    .filter((user) => !role || user.role === role)
    .filter((user) => !status || user.status === status)
    .filter((user) => !search || user.email.includes(search))
    .sort((a, b) => a.email.localeCompare(b.email));
  const total = matches.length;
  return mockResponse({
    data: matches.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

function mockFind(id: string): Promise<StaffUser> {
  const user = mockAccounts.find((account) => account.id === id);
  return user ? mockResponse(user) : mockError(NOT_FOUND, "NOT_FOUND", "Usuario no encontrado");
}

function mockCreate({ email, role }: CreateUserInput): Promise<StaffUser> {
  if (mockAccounts.some((user) => user.email === email)) {
    return mockError(CONFLICT, "CONFLICT", "El correo ya esta registrado");
  }
  const user: StaffUser = {
    id: crypto.randomUUID(),
    email,
    role,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
  };
  mockAccounts.push(user);
  return mockResponse(user);
}

function mockUpdate(id: string, { role, status }: UpdateUserInput): Promise<StaffUser> {
  const user = mockAccounts.find((account) => account.id === id);
  if (!user) return mockError(NOT_FOUND, "NOT_FOUND", "Usuario no encontrado");
  Object.assign(user, role && { role }, status && { status });
  return mockResponse(user);
}

export function listUsers(params: ListUsersParams): Promise<Paginated<StaffUser>> {
  if (isMockEnabled) return mockList(params);
  return request<Paginated<StaffUser>>("/users", { query: { ...params } });
}

export function createUser(input: CreateUserInput): Promise<StaffUser> {
  if (isMockEnabled) return mockCreate(input);
  return request<StaffUser>("/users", { method: "POST", body: input });
}

export function getUser(id: string): Promise<StaffUser> {
  if (isMockEnabled) return mockFind(id);
  return request<StaffUser>(`/users/${id}`);
}

// RN-12: suspender o cambiar la contraseña cierra las sesiones abiertas de esa cuenta.
export function updateUser(id: string, input: UpdateUserInput): Promise<StaffUser> {
  if (isMockEnabled) return mockUpdate(id, input);
  return request<StaffUser>(`/users/${id}`, { method: "PATCH", body: input });
}

// D-32: el teléfono va sin prefijo, como en el registro; una dirección vacía se guarda como null.
export interface MyContactUpdate {
  phone: string;
  address: string | null;
}

export const CURRENT_PASSWORD_INCORRECT = "La contrasena actual es incorrecta";

function mockUpdateMyContact(input: MyContactUpdate): Promise<UserProfile> {
  if (mockProfile.owner) Object.assign(mockProfile.owner, input);
  return mockResponse(structuredClone(mockProfile));
}

function mockChangeMyPassword({ currentPassword }: ChangePasswordInput): Promise<void> {
  if (currentPassword !== MOCK_PASSWORD) {
    return mockError(UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", CURRENT_PASSWORD_INCORRECT);
  }
  return mockResponse(undefined);
}

export function updateMyContact(input: MyContactUpdate): Promise<UserProfile> {
  if (isMockEnabled) return mockUpdateMyContact(input);
  return request<UserProfile>("/users/me", { method: "PATCH", body: input });
}

// La API cierra las demás sesiones y conserva la actual.
export function changeMyPassword(input: ChangePasswordInput): Promise<void> {
  if (isMockEnabled) return mockChangeMyPassword(input);
  return request<void>("/users/me/password", { method: "PUT", body: input });
}
