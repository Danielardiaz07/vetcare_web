import type { SessionUser, StaffUser, UserProfile } from "@/types/auth";
import type {
  AppointmentTypeSetting,
  Consultation,
  Owner,
  Patient,
  ScheduleBlock,
  StaffProfile,
  Vaccination,
  Vaccine,
} from "@/types/domain";

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
  hasAccount: true,
};

// Propietarios que ve recepción: Laura y cinco más.
export const mockOwners: Owner[] = [
  mockOwner,
  ...(
    [
      [
        "CC",
        "1065765432",
        "Carlos Andrés",
        "Ruiz Mendoza",
        "carlos.ruiz@example.com",
        "3104567890",
        false,
      ],
      [
        "CC",
        "77123456",
        "Rosa Elena",
        "Daza Pimienta",
        "rosa.daza@example.com",
        "3159876543",
        true,
      ],
      [
        "CE",
        "4567890",
        "Martín",
        "Fernández López",
        "martin.fernandez@example.com",
        "3201112233",
        false,
      ],
      [
        "CC",
        "1003456789",
        "Valentina",
        "Ortega Quintero",
        "valentina.ortega@example.com",
        "3014445566",
        true,
      ],
      [
        "TI",
        "1065987654",
        "Samuel",
        "Pérez Arias",
        "samuel.perez@example.com",
        "3127778899",
        false,
      ],
    ] as const
  ).map(
    ([documentType, documentNumber, firstNames, lastNames, email, phone, hasAccount], index) => ({
      id: `6a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c${String(index).padStart(2, "0")}`,
      documentType,
      documentNumber,
      firstNames,
      lastNames,
      email,
      phone,
      address: null,
      active: index !== 3,
      hasAccount,
    }),
  ),
];

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

// Mascotas que ve el panel: las de Laura y las de otros propietarios.
export const mockClinicPatients: Patient[] = [
  ...mockPatients,
  ...(
    [
      [1, "Rocky", "DOG", "Pastor alemán", "MALE", "2019-05-20", 34.2, true],
      [2, "Nala", "CAT", "Siamés", "FEMALE", "2024-02-11", 3.8, true],
      [2, "Toby", "DOG", "Beagle", "MALE", "2026-08-30", 4.5, true],
      [3, "Kiwi", "OTHER", "Periquito", "FEMALE", "2025-06-01", 0.1, true],
      [4, "Simba", "CAT", "Persa", "MALE", "2018-11-03", 5.1, false],
    ] as const
  ).map(([ownerIndex, name, species, breed, sex, birthDate, weightKg, active], index) => ({
    id: `7d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f${String(index).padStart(2, "0")}`,
    ownerId: mockOwners[ownerIndex]?.id ?? mockOwner.id,
    name,
    species,
    breed,
    sex,
    birthDate,
    weightKg,
    photoPath: null,
    active,
  })),
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

const MOCK_CREATED_AT = "2026-09-01T13:00:00.000Z";

// Cuentas que ve el administrador en Usuarios: el personal de prueba más otras ocho.
export const mockStaffAccounts: StaffUser[] = [
  ...mockStaffUsers.map(({ id, email, role }) => ({
    id,
    email,
    role: role as StaffUser["role"],
    status: "ACTIVE" as const,
    createdAt: MOCK_CREATED_AT,
  })),
  ...(
    [
      ["andres.mejia@example.com", "VETERINARIAN", "ACTIVE"],
      ["camila.rojas@example.com", "VETERINARIAN", "ACTIVE"],
      ["diana.castro@example.com", "RECEPTIONIST", "SUSPENDED"],
      ["felipe.ortiz@example.com", "GROOMER", "ACTIVE"],
      ["juliana.vega@example.com", "RECEPTIONIST", "ACTIVE"],
      ["mateo.suarez@example.com", "VETERINARIAN", "SUSPENDED"],
      ["paola.daza@example.com", "GROOMER", "ACTIVE"],
      ["sergio.arias@example.com", "ADMIN", "ACTIVE"],
    ] as const
  ).map(([email, role, status], index) => ({
    id: `9c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e${String(index).padStart(2, "0")}`,
    email,
    role,
    status,
    createdAt: MOCK_CREATED_AT,
  })),
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
    address: mockOwner.address,
  },
};

const [, mockVetUser, mockGroomerUser] = mockStaffUsers;

// Perfiles de personal (D-22). Camila Rojas, Felipe Ortiz y Paola Daza tienen cuenta pero aún no perfil.
export const mockVeterinarians: StaffProfile[] = [
  {
    id: "3e4f5a6b-7c8d-4e9f-8a0b-1c2d3e4f5a01",
    userId: mockVetUser?.id ?? null,
    documentType: "CC",
    documentNumber: "1065432198",
    firstNames: "Natalia",
    lastNames: "Quintero Ramos",
    phone: "3104567890",
    specialty: "Medicina general",
    active: true,
    createdAt: MOCK_CREATED_AT,
  },
  {
    id: "3e4f5a6b-7c8d-4e9f-8a0b-1c2d3e4f5a02",
    userId: mockStaffAccounts.find((user) => user.email === "andres.mejia@example.com")?.id ?? null,
    documentType: "CC",
    documentNumber: "1065789012",
    firstNames: "Andrés",
    lastNames: "Mejía Torres",
    phone: "3157894561",
    specialty: "Cirugía",
    active: true,
    createdAt: MOCK_CREATED_AT,
  },
];

export const mockGroomers: StaffProfile[] = [
  {
    id: "4f5a6b7c-8d9e-4f0a-9b1c-2d3e4f5a6b01",
    userId: mockGroomerUser?.id ?? null,
    documentType: "CC",
    documentNumber: "1065345678",
    firstNames: "Valentina",
    lastNames: "Ospina Díaz",
    phone: "3012345678",
    active: true,
    createdAt: MOCK_CREATED_AT,
  },
];

const WEEKDAYS = [1, 2, 3, 4, 5] as const;

export const mockSchedules: Record<string, ScheduleBlock[]> = {
  "3e4f5a6b-7c8d-4e9f-8a0b-1c2d3e4f5a01": WEEKDAYS.flatMap((weekday) => [
    { weekday, startTime: "08:00", endTime: "12:00" },
    { weekday, startTime: "14:00", endTime: "18:00" },
  ]),
  "3e4f5a6b-7c8d-4e9f-8a0b-1c2d3e4f5a02": WEEKDAYS.map((weekday) => ({
    weekday,
    startTime: "08:00",
    endTime: "17:00",
  })),
  "4f5a6b7c-8d9e-4f0a-9b1c-2d3e4f5a6b01": WEEKDAYS.map((weekday) => ({
    weekday,
    startTime: "09:00",
    endTime: "17:00",
  })),
};

// D-21: duraciones iniciales.
export const mockAppointmentTypes: AppointmentTypeSetting[] = [
  { type: "GENERAL_CONSULTATION", durationMinutes: 30, professional: "VETERINARIAN" },
  { type: "VACCINATION", durationMinutes: 30, professional: "VETERINARIAN" },
  { type: "CHECKUP", durationMinutes: 30, professional: "VETERINARIAN" },
  { type: "GROOMING", durationMinutes: 90, professional: "GROOMER" },
];

// D-27: catálogo mínimo de vacunas, sin stock.
export const mockVaccines: Vaccine[] = [
  { id: "5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e01", name: "Rabia", price: 45000, active: true },
  { id: "5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e02", name: "Parvovirus", price: 55000, active: true },
  { id: "5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e03", name: "Triple felina", price: 60000, active: true },
  { id: "5c6d7e8f-9a0b-4c1d-8e2f-3a4b5c6d7e04", name: "Moquillo", price: 50000, active: true },
];

const [mockVet] = mockVeterinarians;
const mockVetName = {
  id: mockVet?.id ?? "",
  firstNames: mockVet?.firstNames ?? "",
  lastNames: mockVet?.lastNames ?? "",
};
const ROCKY_ID = "7d2e3f4a-5b6c-4d7e-8f9a-0b1c2d3e4f00";
const LUNA_ID = "8a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

// Historial de prueba: Rocky tiene cuatro consultas para ver que solo salen las tres últimas.
export const mockConsultations: Consultation[] = (
  [
    [ROCKY_ID, "2026-09-28", "Otitis externa", "Limpieza y gotas óticas por 7 días", 34.2],
    [ROCKY_ID, "2026-07-15", "Dermatitis alérgica", "Champú medicado y cambio de alimento", 33.8],
    [ROCKY_ID, "2026-04-02", "Control general sin hallazgos", "Desparasitación interna", 33.1],
    [ROCKY_ID, "2025-12-10", "Gastroenteritis leve", "Dieta blanda por 3 días", 32.6],
    [LUNA_ID, "2026-08-20", "Conjuntivitis", "Colirio antibiótico por 5 días", 27.5],
  ] as const
).map(([patientId, date, diagnosis, treatment, weightKg], index) => ({
  id: `2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d${String(index).padStart(2, "0")}`,
  appointmentId: `3c4d5e6f-7a8b-4c9d-8e0f-1a2b3c4d5e${String(index).padStart(2, "0")}`,
  patientId,
  veterinarian: mockVetName,
  symptoms: "Revisión de prueba",
  weightKg,
  temperatureC: 38.5,
  diagnosis,
  treatment,
  prescription: null,
  internalNotes: null,
  cost: 60000,
  createdAt: `${date}T14:00:00.000Z`,
}));

export const mockVaccinations: Vaccination[] = (
  [
    [ROCKY_ID, 0, "2025-10-20", "2026-10-20"],
    [ROCKY_ID, 1, "2025-08-01", "2026-08-01"],
    [ROCKY_ID, 3, "2026-05-10", "2027-05-10"],
    [LUNA_ID, 0, "2026-03-14", "2027-03-14"],
  ] as const
).map(([patientId, vaccineIndex, appliedAt, nextDoseAt], index) => {
  const vaccine = mockVaccines[vaccineIndex];
  return {
    id: `4d5e6f7a-8b9c-4d0e-8f1a-2b3c4d5e6f${String(index).padStart(2, "0")}`,
    patientId,
    vaccine: { id: vaccine?.id ?? "", name: vaccine?.name ?? "" },
    veterinarian: mockVetName,
    lot: `L-2026-${String(index + 1).padStart(3, "0")}`,
    appliedAt,
    nextDoseAt,
    price: vaccine?.price ?? 0,
    createdAt: `${appliedAt}T15:00:00.000Z`,
  };
});
