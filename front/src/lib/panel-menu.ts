import type { IconName } from "@/components/ui/icon";
import { ROUTES } from "@/lib/constants";
import type { Role } from "@/types/auth";

export type StaffRole = Exclude<Role, "OWNER">;

export type PanelMenuItem = {
  href: string;
  label: string;
  icon: IconName;
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  RECEPTIONIST: "Recepción",
  VETERINARIAN: "Veterinario",
  GROOMER: "Estilista",
  ADMIN: "Administrador",
};

// RN-13: cada rol ve y abre solo las secciones de su menú.
export const PANEL_MENU: Record<StaffRole, PanelMenuItem[]> = {
  RECEPTIONIST: [
    { href: ROUTES.panelAgenda, label: "Agenda", icon: "calendar" },
    { href: ROUTES.panelOwners, label: "Propietarios", icon: "user" },
    { href: ROUTES.panelPatients, label: "Pacientes", icon: "paw" },
    { href: ROUTES.panelInvoices, label: "Facturación", icon: "receipt" },
  ],
  VETERINARIAN: [
    { href: ROUTES.panelAgenda, label: "Mi agenda", icon: "calendar" },
    { href: ROUTES.panelPatients, label: "Pacientes", icon: "paw" },
    { href: ROUTES.panelAttention, label: "Atención", icon: "file-medical" },
  ],
  GROOMER: [{ href: ROUTES.panelAgenda, label: "Mi agenda", icon: "calendar" }],
  ADMIN: [
    { href: ROUTES.panelUsers, label: "Usuarios", icon: "users" },
    { href: ROUTES.panelStaff, label: "Personal y horarios", icon: "clock" },
  ],
};

export const isStaffRole = (role: Role): role is StaffRole => role !== "OWNER";

// Una ruta con subrutas (/panel/attention/123) pertenece al enlace que la contiene.
export function panelItemFor(role: StaffRole, pathname: string): PanelMenuItem | undefined {
  return PANEL_MENU[role].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
