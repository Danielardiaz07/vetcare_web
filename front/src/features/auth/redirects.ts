import { ROUTES } from "@/lib/constants";
import type { Role } from "@/types/auth";

export const homeRouteFor = (role: Role) => (role === "OWNER" ? ROUTES.portal : ROUTES.panel);

// Solo rutas internas: "//otro-sitio.com" o una URL completa permitirían redirigir fuera de la app.
export function safeNextPath(next: string | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

// "/login?recover=1" abre directamente el formulario para recuperar la contraseña.
export const RECOVER_PARAM = "recover";
export const RECOVER_PASSWORD_HREF = `${ROUTES.login}?${RECOVER_PARAM}=1`;
