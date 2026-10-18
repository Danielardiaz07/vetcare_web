export type DocumentType = "CC" | "TI" | "RC" | "CE" | "PA" | "NIT" | "PPT";

export type Species = "DOG" | "CAT" | "OTHER";
export type Sex = "MALE" | "FEMALE";

export interface Owner {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  email: string | null;
  phone: string;
  address: string | null;
  active: boolean;
  hasAccount: boolean;
}

export interface Patient {
  id: string;
  ownerId: string;
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  birthDate: string;
  weightKg: number;
  photoPath: string | null;
  active: boolean;
}

// D-22: veterinarios y estilistas son perfiles enlazados a una cuenta de Usuarios.
export interface StaffProfile {
  id: string;
  userId: string | null;
  documentType: DocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  phone: string;
  specialty?: string;
  active: boolean;
  createdAt: string;
}

// weekday va de 1 (lunes) a 7 (domingo); las horas en HH:mm.
export interface ScheduleBlock {
  weekday: number;
  startTime: string;
  endTime: string;
}

export type AppointmentType = "GENERAL_CONSULTATION" | "VACCINATION" | "CHECKUP" | "GROOMING";

export interface AppointmentTypeSetting {
  type: AppointmentType;
  durationMinutes: number;
  professional: "VETERINARIAN" | "GROOMER";
}

export type AppointmentStatus = "SCHEDULED" | "CONFIRMED" | "ATTENDED" | "CANCELLED" | "NO_SHOW";

// Lo que cualquier usuario ve de un veterinario o estilista activo.
export interface Professional {
  id: string;
  firstNames: string;
  lastNames: string;
  specialty?: string;
}

export interface AvailableSlot {
  startsAt: string;
  endsAt: string;
  professionals: Professional[];
}

// RN-33: si el día no tiene franjas, la API sugiere otras fechas.
export interface Availability {
  date: string;
  durationMinutes: number;
  slots: AvailableSlot[];
  suggestedDates: string[];
}

export interface Appointment {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  cancelReason: string | null;
  patient: { id: string; name: string };
  professional: Professional;
  // Solo para el personal: el propietario no recibe este dato en sus citas.
  owner?: { id: string; firstNames: string; lastNames: string; phone: string };
}
