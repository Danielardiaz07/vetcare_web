import type { StaffProfileSummary, UserProfile } from "@/types/auth";

// Recepción y administración no tienen perfil con datos personales (D-22).
// "unavailable": la API todavía no envía el perfil en /users/me (P-16).
export type OwnStaffProfile =
  | { status: "not-applicable" }
  | { status: "unavailable" }
  | { status: "missing" }
  | { status: "ready"; profile: StaffProfileSummary };

export function ownStaffProfile(account: UserProfile): OwnStaffProfile {
  if (account.role !== "VETERINARIAN" && account.role !== "GROOMER") {
    return { status: "not-applicable" };
  }
  const field = account.role === "VETERINARIAN" ? account.veterinarian : account.groomer;
  if (field === undefined) return { status: "unavailable" };
  if (field === null) return { status: "missing" };
  return { status: "ready", profile: field };
}

export const staffFullName = ({ firstNames, lastNames }: StaffProfileSummary) =>
  `${firstNames} ${lastNames}`;

// Nombre que ve el personal en la barra del panel: el de su perfil o, si no tiene, su correo.
export function accountDisplayName(account: UserProfile | null, email: string): string {
  if (!account) return email;
  const own = ownStaffProfile(account);
  return own.status === "ready" ? staffFullName(own.profile) : email;
}
