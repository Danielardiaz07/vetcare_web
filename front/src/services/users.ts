import { request } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import { mockStaffAccounts } from "@/services/mocks/fixtures";
import type { Paginated } from "@/types/api";
import type { StaffUser, UserStatus } from "@/types/auth";

const NOT_FOUND = 404;
const CONFLICT = 409;

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
