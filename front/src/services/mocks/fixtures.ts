import type { SessionUser, UserProfile } from "@/types/auth";
import type { Owner, Patient } from "@/types/domain";

// Datos ficticios para desarrollar sin la API; no corresponden a clientes reales.
const MOCK_EMAIL = "laura.gomez@example.com";

export const mockOwner: Owner = {
  id: "5f0c2a8e-3b1d-4c6e-9a7f-1d2e3f4a5b6c",
  documentType: "CC",
  documentNumber: "1065123456",
  firstNames: "Laura Marcela",
  lastNames: "Gómez Pérez",
  email: MOCK_EMAIL,
  phone: "3001234567",
  address: "Calle 16 # 12-45, Valledupar",
  active: true,
};

export const mockPatients: Patient[] = [
  {
    id: "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
    ownerId: mockOwner.id,
    name: "Luna",
    species: "DOG",
    breed: "Golden retriever",
    sex: "FEMALE",
    birthDate: "2021-03-14",
    weightKg: 27.5,
    photoPath: null,
    active: true,
  },
  {
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
    ownerId: mockOwner.id,
    name: "Milo",
    species: "CAT",
    breed: "Criollo",
    sex: "MALE",
    birthDate: "2023-07-02",
    weightKg: 4.2,
    photoPath: null,
    active: true,
  },
];

export const MOCK_PASSWORD = "Vetcare123";
export const MOCK_OTP_CODE = "123456";

// Propietario que la clínica ya tiene registrado pero que aún no creó su cuenta (D-17).
export const mockUnlinkedOwner = {
  documentNumber: "1065765432",
  email: "carlos.ruiz@example.com",
};

export const mockSessionUser: SessionUser = {
  id: "3e7a9c1b-5d2f-4b8a-9e6c-7f1a2b3c4d5e",
  email: MOCK_EMAIL,
  role: "OWNER",
  ownerId: mockOwner.id,
};

// Personal de prueba, uno por rol; entran con MOCK_PASSWORD.
export const mockStaffUsers: SessionUser[] = [
  {
    id: "7b1e2c3d-4f5a-4b6c-8d7e-9f0a1b2c3d41",
    email: "recepcion@example.com",
    role: "RECEPTIONIST",
    ownerId: null,
  },
  {
    id: "7b1e2c3d-4f5a-4b6c-8d7e-9f0a1b2c3d42",
    email: "veterinario@example.com",
    role: "VETERINARIAN",
    ownerId: null,
  },
  {
    id: "7b1e2c3d-4f5a-4b6c-8d7e-9f0a1b2c3d43",
    email: "estilista@example.com",
    role: "GROOMER",
    ownerId: null,
  },
  {
    id: "7b1e2c3d-4f5a-4b6c-8d7e-9f0a1b2c3d44",
    email: "admin@example.com",
    role: "ADMIN",
    ownerId: null,
  },
];

export const mockProfile: UserProfile = {
  id: mockSessionUser.id,
  email: mockSessionUser.email,
  role: mockSessionUser.role,
  status: "ACTIVE",
  owner: {
    id: mockOwner.id,
    documentType: mockOwner.documentType,
    documentNumber: mockOwner.documentNumber,
    firstNames: mockOwner.firstNames,
    lastNames: mockOwner.lastNames,
    phone: mockOwner.phone,
  },
};
