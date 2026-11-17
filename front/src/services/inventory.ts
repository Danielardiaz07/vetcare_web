import { addDays, clinicDateOf } from "@/lib/clinic-time";
import { request } from "@/services/http-client";
import { isMockEnabled, mockError, mockResponse } from "@/services/mocks";
import {
  mockInventoryVaccines,
  mockMedications,
  type MockStockedProduct,
} from "@/services/mocks/fixtures";
import type { Paginated } from "@/types/api";
import type {
  ExpiryStatus,
  InventoryAlert,
  InventoryAlertReason,
  InventoryAlerts,
  InventoryItem,
  InventoryKind,
  Vaccine,
} from "@/types/domain";

const NOT_FOUND = 404;
const CONFLICT = 409;

// "EXPIRING" incluye también los ya vencidos, como en la API.
export type InventoryAlertFilter = "LOW_STOCK" | "EXPIRING";

export interface ListInventoryParams {
  page: number;
  limit: number;
  q?: string;
  alert?: InventoryAlertFilter;
}

export interface CreateInventoryInput {
  name: string;
  price: number;
  stock: number;
  minStock: number;
  expiresAt?: string;
}

// expiresAt: null borra el vencimiento (D-36).
export type UpdateInventoryInput = Partial<{
  name: string;
  price: number;
  stock: number;
  minStock: number;
  expiresAt: string | null;
  active: boolean;
}>;

const LIST_PATH: Record<InventoryKind, string> = {
  MEDICATION: "/inventory/medications",
  VACCINE: "/inventory/vaccines",
};

// La vacuna se crea en el catálogo (POST /vaccines) y luego se completa su stock: son dos pasos.
export class VaccineStockNotSavedError extends Error {
  constructor(readonly vaccine: Vaccine) {
    super(
      "La vacuna se creó, pero no se guardó su stock ni su vencimiento. Edítala para completarlos.",
    );
  }
}

// Los cambios de prueba viven mientras la pestaña está abierta.
const mockStore: Record<InventoryKind, MockStockedProduct[]> = {
  MEDICATION: structuredClone(mockMedications),
  VACCINE: structuredClone(mockInventoryVaccines),
};
// Solo para los datos de prueba: el umbral real lo da la API (P-03, D-36).
const MOCK_EXPIRING_DAYS = 30;

function mockExpiry(expiresAt: string | null, today: string): ExpiryStatus {
  if (!expiresAt) return "NONE";
  if (expiresAt < today) return "EXPIRED";
  return expiresAt <= addDays(today, MOCK_EXPIRING_DAYS) ? "EXPIRING" : "OK";
}

function mockItem(product: MockStockedProduct, today: string): InventoryItem {
  return {
    ...product,
    lowStock: product.stock <= product.minStock,
    expiry: mockExpiry(product.expiresAt, today),
  };
}

function mockList(
  kind: InventoryKind,
  { page, limit, q, alert }: ListInventoryParams,
): Promise<Paginated<InventoryItem>> {
  const today = clinicDateOf(new Date());
  const search = q?.toLowerCase();
  const matches = mockStore[kind]
    .map((product) => mockItem(product, today))
    .filter((item) => !search || item.name.toLowerCase().includes(search))
    .filter((item) => {
      if (!alert) return true;
      if (!item.active) return false;
      return alert === "LOW_STOCK"
        ? item.lowStock
        : item.expiry === "EXPIRING" || item.expiry === "EXPIRED";
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const total = matches.length;
  return mockResponse({
    data: matches.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

function mockAlerts(): Promise<InventoryAlerts> {
  const today = clinicDateOf(new Date());
  const items = (Object.keys(mockStore) as InventoryKind[]).flatMap((kind) =>
    mockStore[kind]
      .filter((product) => product.active)
      .map((product): InventoryAlert => {
        const item = mockItem(product, today);
        const reasons: InventoryAlertReason[] = [];
        if (item.lowStock) reasons.push("LOW_STOCK");
        if (item.expiry === "EXPIRING") reasons.push("EXPIRING");
        if (item.expiry === "EXPIRED") reasons.push("EXPIRED");
        const { id, name, stock, minStock, expiresAt } = item;
        return { kind, id, name, stock, minStock, expiresAt, reasons };
      })
      .filter((alert) => alert.reasons.length > 0),
  );
  const count = (reason: InventoryAlertReason) =>
    items.filter((alert) => alert.reasons.includes(reason)).length;
  return mockResponse({
    expiringDays: MOCK_EXPIRING_DAYS,
    counts: {
      lowStock: count("LOW_STOCK"),
      expiring: count("EXPIRING"),
      expired: count("EXPIRED"),
    },
    items,
  });
}

const nameTaken = (kind: InventoryKind, name: string, exceptId?: string) =>
  mockStore[kind].some(
    (product) => product.id !== exceptId && product.name.toLowerCase() === name.toLowerCase(),
  );

const duplicateMessage = (kind: InventoryKind) =>
  kind === "MEDICATION"
    ? "Ya existe un medicamento con ese nombre"
    : "Ya existe una vacuna con ese nombre";

function mockCreate(kind: InventoryKind, input: CreateInventoryInput): Promise<InventoryItem> {
  if (nameTaken(kind, input.name)) return mockError(CONFLICT, "CONFLICT", duplicateMessage(kind));
  const product: MockStockedProduct = {
    id: crypto.randomUUID(),
    ...input,
    expiresAt: input.expiresAt ?? null,
    active: true,
  };
  mockStore[kind].push(product);
  return mockResponse(mockItem(product, clinicDateOf(new Date())));
}

function mockUpdate(
  kind: InventoryKind,
  id: string,
  input: UpdateInventoryInput,
): Promise<InventoryItem> {
  const product = mockStore[kind].find((item) => item.id === id);
  if (!product) return mockError(NOT_FOUND, "NOT_FOUND", "Producto no encontrado");
  if (input.name && nameTaken(kind, input.name, id)) {
    return mockError(CONFLICT, "CONFLICT", duplicateMessage(kind));
  }
  Object.assign(product, input);
  return mockResponse(mockItem(product, clinicDateOf(new Date())));
}

// RF-22: solo el administrador; la API pagina y filtra por nombre y por alerta.
export function listInventory(
  kind: InventoryKind,
  params: ListInventoryParams,
): Promise<Paginated<InventoryItem>> {
  if (isMockEnabled) return mockList(kind, params);
  return request<Paginated<InventoryItem>>(LIST_PATH[kind], { query: { ...params } });
}

// RN-56: solo productos activos; los umbrales y conteos los calcula la API.
export function getInventoryAlerts(): Promise<InventoryAlerts> {
  if (isMockEnabled) return mockAlerts();
  return request<InventoryAlerts>("/inventory/alerts");
}

export function updateInventoryItem(
  kind: InventoryKind,
  id: string,
  input: UpdateInventoryInput,
): Promise<InventoryItem> {
  if (isMockEnabled) return mockUpdate(kind, id, input);
  return request<InventoryItem>(`${LIST_PATH[kind]}/${id}`, { method: "PATCH", body: input });
}

async function createVaccine({
  name,
  price,
  stock,
  minStock,
  expiresAt,
}: CreateInventoryInput): Promise<InventoryItem> {
  const vaccine = await request<Vaccine>("/vaccines", { method: "POST", body: { name, price } });
  try {
    return await updateInventoryItem("VACCINE", vaccine.id, {
      stock,
      minStock,
      ...(expiresAt && { expiresAt }),
    });
  } catch {
    throw new VaccineStockNotSavedError(vaccine);
  }
}

export function createInventoryItem(
  kind: InventoryKind,
  input: CreateInventoryInput,
): Promise<InventoryItem> {
  if (isMockEnabled) return mockCreate(kind, input);
  if (kind === "VACCINE") return createVaccine(input);
  return request<InventoryItem>(LIST_PATH.MEDICATION, { method: "POST", body: input });
}
