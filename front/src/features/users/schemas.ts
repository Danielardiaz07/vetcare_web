import { z } from "zod";
import { emailField, passwordField } from "@/features/auth/schemas";

// Los propietarios se registran solos (RN-05); aquí solo se crea personal (RN-12).
export const STAFF_ROLES = ["RECEPTIONIST", "VETERINARIAN", "GROOMER", "ADMIN"] as const;
export const MANAGEABLE_STATUSES = ["ACTIVE", "SUSPENDED"] as const;

const roleField = z.enum(STAFF_ROLES, "Selecciona el rol");

export const createUserSchema = z.object({
  email: emailField,
  role: roleField,
  password: passwordField,
});

export const editUserSchema = z
  .object({
    role: roleField,
    status: z.enum(MANAGEABLE_STATUSES, "Selecciona el estado"),
    changePassword: z.boolean(),
    password: z.string(),
  })
  .superRefine((data, context) => {
    if (!data.changePassword) return;
    const result = passwordField.safeParse(data.password);
    for (const issue of result.error?.issues ?? []) {
      context.addIssue({ code: "custom", path: ["password"], message: issue.message });
    }
  });

export type CreateUserFormInput = z.infer<typeof createUserSchema>;
export type EditUserFormInput = z.infer<typeof editUserSchema>;
