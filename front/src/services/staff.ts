import { request } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import {
  mockAppointmentTypes,
  mockGroomers,
  mockSchedules,
  mockStaffAccounts,
  mockVeterinarians,
} from "@/services/mocks/fixtures";
import { localPhone } from "@/services/owners";
import { listUsers } from "@/services/users";
import type { Paginated } from "@/types/api";
import type { StaffUser } from "@/types/auth";
import type {
  AppointmentType,
  AppointmentTypeSetting,
  DocumentType,
  ScheduleBlock,
  StaffProfile,
} from "@/types/domain";

const NOT_FOUND = 404;
const CONFLICT = 409;
const PAGE_SIZE = 10;
// El personal de una clínica cabe en una sola página.
const ALL_LIMIT = 100;

export type StaffKind = "veterinarians" | "groomers";

const ROLE_OF_KIND: Record<StaffKind, StaffUser["role"]> = {
  veterinarians: "VETERINARIAN",
  groomers: "GROOMER",
};

export interface ListStaffParams {
  page: number;
  limit?: number;
}

export interface CreateStaffInput {
  userId: string;
  documentType: DocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  phone: string;
  specialty?: string;
}

export type UpdateStaffInput = Partial<{
  firstNames: string;
  lastNames: string;
  phone: string;
  specialty: string;
  active: boolean;
}>;

const withLocalPhone = (profile: StaffProfile): StaffProfile => ({
  ...profile,
  phone: localPhone(profile.phone),
});

// Los cambios de prueba viven mientras la pestaña está abierta.
const mockStores: Record<StaffKind, StaffProfile[]> = {
  veterinarians: structuredClone(mockVeterinarians),
  groomers: structuredClone(mockGroomers),
};
const mockScheduleStore = structuredClone(mockSchedules);
const mockTypeStore = structuredClone(mockAppointmentTypes);

const mockNotFound = () => mockError(NOT_FOUND, "NOT_FOUND", "Perfil no encontrado");

function mockList(kind: StaffKind, page: number, limit: number): Promise<Paginated<StaffProfile>> {
  const matches = [...mockStores[kind]].sort((a, b) => a.lastNames.localeCompare(b.lastNames));
  const total = matches.length;
  return mockResponse({
    data: matches.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

function mockCreate(kind: StaffKind, input: CreateStaffInput): Promise<StaffProfile> {
  const all = [...mockStores.veterinarians, ...mockStores.groomers];
  if (all.some((profile) => profile.userId === input.userId)) {
    return mockError(CONFLICT, "CONFLICT", "El usuario ya tiene un perfil");
  }
  if (mockStores[kind].some((profile) => profile.documentNumber === input.documentNumber)) {
    return mockError(CONFLICT, "CONFLICT", "La cedula ya esta registrada");
  }
  const profile: StaffProfile = {
    ...input,
    id: crypto.randomUUID(),
    active: true,
    createdAt: new Date().toISOString(),
  };
  mockStores[kind].push(profile);
  return mockResponse(profile);
}

function mockUpdate(kind: StaffKind, id: string, input: UpdateStaffInput): Promise<StaffProfile> {
  const profile = mockStores[kind].find((item) => item.id === id);
  if (!profile) return mockNotFound();
  Object.assign(profile, input);
  return mockResponse(profile);
}

export async function listStaff(
  kind: StaffKind,
  { page, limit = PAGE_SIZE }: ListStaffParams,
): Promise<Paginated<StaffProfile>> {
  if (isMockEnabled) return mockList(kind, page, limit);
  const result = await request<Paginated<StaffProfile>>(`/${kind}`, { query: { page, limit } });
  return { ...result, data: result.data.map(withLocalPhone) };
}

export async function createStaff(kind: StaffKind, input: CreateStaffInput): Promise<StaffProfile> {
  if (isMockEnabled) return mockCreate(kind, input);
  return withLocalPhone(await request<StaffProfile>(`/${kind}`, { method: "POST", body: input }));
}

export async function updateStaff(
  kind: StaffKind,
  id: string,
  input: UpdateStaffInput,
): Promise<StaffProfile> {
  if (isMockEnabled) return mockUpdate(kind, id, input);
  return withLocalPhone(
    await request<StaffProfile>(`/${kind}/${id}`, { method: "PATCH", body: input }),
  );
}

export const listVeterinarians = (params: ListStaffParams) => listStaff("veterinarians", params);
export const createVeterinarian = (input: CreateStaffInput) => createStaff("veterinarians", input);
export const updateVeterinarian = (id: string, input: UpdateStaffInput) =>
  updateStaff("veterinarians", id, input);

export const listGroomers = (params: ListStaffParams) => listStaff("groomers", params);
export const createGroomer = (input: CreateStaffInput) => createStaff("groomers", input);
export const updateGroomer = (id: string, input: UpdateStaffInput) =>
  updateStaff("groomers", id, input);

// D-22: la cuenta se crea antes en Usuarios; aquí solo se ofrecen las activas de ese rol sin perfil.
export async function listAccountsWithoutProfile(kind: StaffKind): Promise<StaffUser[]> {
  const role = ROLE_OF_KIND[kind];
  if (isMockEnabled) {
    const linked = new Set(mockStores[kind].map((profile) => profile.userId));
    return mockResponse(
      mockStaffAccounts.filter(
        (user) => user.role === role && user.status === "ACTIVE" && !linked.has(user.id),
      ),
    );
  }
  const [accounts, profiles] = await Promise.all([
    listUsers({ page: 1, limit: ALL_LIMIT, role, status: "ACTIVE" }),
    listStaff(kind, { page: 1, limit: ALL_LIMIT }),
  ]);
  const linked = new Set(profiles.data.map((profile) => profile.userId));
  return accounts.data.filter((user) => !linked.has(user.id));
}

export async function getSchedule(kind: StaffKind, id: string): Promise<ScheduleBlock[]> {
  if (isMockEnabled) return mockResponse(mockScheduleStore[id] ?? []);
  const blocks = await request<(ScheduleBlock & { id: string })[]>(`/${kind}/${id}/schedules`);
  return blocks.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime }));
}

// D-22: se reemplaza la semana completa en un solo PUT.
export async function saveSchedule(
  kind: StaffKind,
  id: string,
  blocks: ScheduleBlock[],
): Promise<void> {
  if (isMockEnabled) {
    mockScheduleStore[id] = blocks;
    await mockResponse(undefined);
    return;
  }
  await request<unknown>(`/${kind}/${id}/schedules`, {
    method: "PUT",
    body: { schedules: blocks },
  });
}

export function listAppointmentTypes(): Promise<AppointmentTypeSetting[]> {
  if (isMockEnabled) return mockResponse(mockTypeStore);
  return request<AppointmentTypeSetting[]>("/appointment-types");
}

// D-21: la duración siempre es múltiplo de 30 minutos.
export function updateAppointmentType(
  type: AppointmentType,
  durationMinutes: number,
): Promise<AppointmentTypeSetting> {
  if (isMockEnabled) {
    const setting = mockTypeStore.find((item) => item.type === type);
    if (!setting) return mockError(NOT_FOUND, "NOT_FOUND", "Tipo de cita no encontrado");
    setting.durationMinutes = durationMinutes;
    return mockResponse(setting);
  }
  return request<AppointmentTypeSetting>(`/appointment-types/${type}`, {
    method: "PATCH",
    body: { durationMinutes },
  });
}
