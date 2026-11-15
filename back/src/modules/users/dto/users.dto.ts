import { Role, UserStatus } from "@prisma/client";
import { z } from "zod";
import { FieldLimit } from "@/config/constants";
import { addressField, emailField, passwordField, phoneField } from "@/shared/schemas/fields";
import { paginationQuerySchema } from "@/shared/utils/pagination";

// Los propietarios se registran solos (RN-05); el administrador solo crea personal (RN-12).
const STAFF_ROLES = [Role.RECEPTIONIST, Role.VETERINARIAN, Role.GROOMER, Role.ADMIN] as const;
const MANAGEABLE_STATUSES = [UserStatus.ACTIVE, UserStatus.SUSPENDED] as const;

export const createStaffUserRequestSchema = z.object({
  email: emailField,
  password: passwordField,
  role: z.enum(STAFF_ROLES),
});

export const updateStaffUserRequestSchema = z
  .object({
    role: z.enum(STAFF_ROLES),
    status: z.enum(MANAGEABLE_STATUSES),
    password: passwordField,
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Envia al menos un campo para actualizar");

export const listStaffUsersQuerySchema = paginationQuerySchema.extend({
  role: z.enum(STAFF_ROLES).optional(),
  status: z.enum(MANAGEABLE_STATUSES).optional(),
  q: z.string().trim().min(1).max(FieldLimit.SEARCH_MAX).optional(),
});

// El correo y la cédula no se editan aquí (D-18, RN-17); el teléfono llega sin prefijo, como en el registro.
export const updateMyContactRequestSchema = z
  .object({ phone: phoneField, address: addressField.nullable() })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "Envia al menos un campo para actualizar");

export const changePasswordRequestSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "La contrasena actual es obligatoria")
      .max(FieldLimit.PASSWORD_MAX),
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contrasenas no coinciden",
  });

export type CreateStaffUserRequestDto = z.infer<typeof createStaffUserRequestSchema>;
export type UpdateMyContactRequestDto = z.infer<typeof updateMyContactRequestSchema>;
export type ChangePasswordRequestDto = z.infer<typeof changePasswordRequestSchema>;
export type UpdateStaffUserRequestDto = z.infer<typeof updateStaffUserRequestSchema>;
export type ListStaffUsersQueryDto = z.infer<typeof listStaffUsersQuerySchema>;

export interface OwnerSummaryDto {
  id: string;
  documentType: string;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  phone: string;
  address: string | null;
}

export interface StaffProfileSummaryDto {
  id: string;
  documentType: string;
  documentNumber: string;
  firstNames: string;
  lastNames: string;
  phone: string;
  active: boolean;
}

export interface VeterinarianSummaryDto extends StaffProfileSummaryDto {
  specialty: string;
}

export interface UserProfileResponseDto {
  id: string;
  email: string;
  role: string;
  status: string;
  owner: OwnerSummaryDto | null;
  veterinarian: VeterinarianSummaryDto | null;
  groomer: StaffProfileSummaryDto | null;
}

export interface StaffUserResponseDto {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
}
