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
}

export interface UserProfile {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  owner: OwnerSummary | null;
}

export interface StaffUser {
  id: string;
  email: string;
  role: Exclude<Role, "OWNER">;
  status: UserStatus;
  createdAt: string;
}
