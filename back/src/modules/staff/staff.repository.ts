import type { DocumentType, Role } from "@prisma/client";

export interface StaffProfileRecord {
  id: string;
  userId: string | null;
  documentType: DocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  phone: string;
  specialty?: string;
  active: boolean;
  createdAt: Date;
}

export interface NewStaffData {
  userId: string;
  documentType: DocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  phone: string;
  specialty?: string;
}

export interface StaffUpdateData {
  firstNames?: string;
  lastNames?: string;
  phone?: string;
  specialty?: string;
  active?: boolean;
}

export interface StaffListFilters {
  q?: string;
  active?: boolean;
  skip: number;
  take: number;
}

export interface ScheduleRecord {
  id: string;
  weekday: number;
  startTime: Date;
  endTime: Date;
}

export type NewScheduleBlock = Omit<ScheduleRecord, "id">;

export interface LinkableUser {
  id: string;
  role: Role;
  veterinarianId: string | null;
  groomerId: string | null;
}

// Contrato común de veterinarios y estilistas: cada uno vive en su tabla (06 §4).
export interface StaffRepository {
  create(data: NewStaffData): Promise<StaffProfileRecord>;
  findById(id: string): Promise<StaffProfileRecord | null>;
  existsByDocument(documentNumber: string): Promise<boolean>;
  list(filters: StaffListFilters): Promise<{ items: StaffProfileRecord[]; total: number }>;
  update(id: string, data: StaffUpdateData): Promise<StaffProfileRecord>;
  listSchedules(id: string): Promise<ScheduleRecord[]>;
  replaceSchedules(id: string, blocks: NewScheduleBlock[]): Promise<ScheduleRecord[]>;
}
