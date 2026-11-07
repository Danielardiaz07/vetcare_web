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

// D-28 (1): cada paciente trae los datos básicos de su propietario.
export interface PatientOwner {
  id: string;
  firstNames: string;
  lastNames: string;
  documentNumber: string;
}

export interface Patient {
  id: string;
  ownerId: string;
  owner: PatientOwner;
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

type StaffName = { id: string; firstNames: string; lastNames: string };

export interface Consultation {
  id: string;
  appointmentId: string;
  patientId: string;
  veterinarian: StaffName;
  symptoms: string;
  weightKg: number;
  temperatureC: number;
  diagnosis: string;
  treatment: string;
  prescription: string | null;
  // RN-42: solo llega al personal; el propietario nunca la recibe.
  internalNotes?: string | null;
  cost: number;
  createdAt: string;
}

export interface Vaccination {
  id: string;
  patientId: string;
  vaccine: { id: string; name: string };
  veterinarian: StaffName;
  lot: string;
  appliedAt: string;
  nextDoseAt: string | null;
  price: number;
  createdAt: string;
}

// D-27: catálogo mínimo de vacunas (nombre y precio), sin stock.
export interface Vaccine {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

// RN-49: estado de la última dosis de cada vacuna en el carné.
export type VaccineStatus = "UP_TO_DATE" | "DUE_SOON" | "OVERDUE";

export interface VaccinationCardEntry extends Vaccination {
  status: VaccineStatus;
}

// D-34: cirugía y examen ya realizados (fecha AAAA-MM-DD, nunca futura).
export interface Surgery {
  id: string;
  patientId: string;
  veterinarian: StaffName;
  procedure: string;
  performedAt: string;
  notes: string | null;
  createdAt: string;
}

export interface LabExam {
  id: string;
  patientId: string;
  veterinarian: StaffName;
  examType: string;
  performedAt: string;
  results: string;
  createdAt: string;
}

export type HospitalizationStatus = "ADMITTED" | "DISCHARGED";

// D-34: el ingreso y el egreso los pone el servidor.
export interface Hospitalization {
  id: string;
  patientId: string;
  veterinarian: StaffName;
  reason: string;
  status: HospitalizationStatus;
  admittedAt: string;
  dischargedAt: string | null;
  dischargeNotes: string | null;
  createdAt: string;
}

// RN-41: el historial llega del más reciente al más antiguo.
export type HistoryEntry =
  | { kind: "CONSULTATION"; date: string; consultation: Consultation }
  | { kind: "VACCINATION"; date: string; vaccination: Vaccination }
  | { kind: "SURGERY"; date: string; surgery: Surgery }
  | { kind: "HOSPITALIZATION"; date: string; hospitalization: Hospitalization }
  | { kind: "LAB_EXAM"; date: string; labExam: LabExam };

// D-33: servicio estético que registra el estilista (RN-51).
export type GroomingType = "BATH" | "HAIRCUT" | "STYLING";

export interface GroomingService {
  id: string;
  appointmentId: string | null;
  patientId: string;
  type: GroomingType;
  observations: string | null;
  cost: number;
  groomer: StaffName;
  createdAt: string;
}

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER";

export type InvoiceStatus = "PAID" | "VOIDED";

// RN-70: consulta, vacunación o servicio estético que aún no se ha facturado (D-33).
export interface PendingConcept {
  kind: "CONSULTATION" | "VACCINATION" | "GROOMING";
  id: string;
  description: string;
  patientName: string;
  amount: number;
  date: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
  taxed: boolean;
  tax: number;
  consultationId: string | null;
  vaccinationId: string | null;
  groomingServiceId: string | null;
}

// D-27: nace Pagada; solo el ADMIN la anula con motivo (RN-74).
export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  owner: { id: string; firstNames: string; lastNames: string; documentNumber: string };
  subtotal: number;
  tax: number;
  total: number;
  voidReason: string | null;
  items: InvoiceItem[];
  createdAt: string;
}
