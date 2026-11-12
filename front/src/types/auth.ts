import type { DocumentType } from "@/types/domain";

export type Role = "OWNER" | "RECEPTIONIST" | "VETERINARIAN" | "GROOMER" | "ADMIN";
export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  ownerId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}

export interface RegisterResponse {
  email: string;
  message: string;
}

export interface OwnerSummary {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  phone: string;
  // D-28 (2): /users/me envía la dirección; null = no tiene.
  address: string | null;
}

export interface StaffProfileSummary {
  id: string;
  documentType: DocumentType;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  phone: string;
  specialty?: string;
  active: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  owner: OwnerSummary | null;
  // P-16: la API los agregará a /users/me; mientras tanto llegan undefined (no es lo mismo que null = sin perfil).
  veterinarian?: StaffProfileSummary | null;
  groomer?: StaffProfileSummary | null;
}

export interface StaffUser {
  id: string;
  email: string;
  role: Exclude<Role, "OWNER">;
  status: UserStatus;
  createdAt: string;
}
