import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PROTECTED_ROUTE_PREFIXES, REFRESH_COOKIE_NAME, ROUTES } from "@/lib/constants";
import { env } from "@/lib/env";

const isProtected = (pathname: string) =>
  PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

// Solo comprueba que exista sesión; la verificación real y el rol los hace la API.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Con datos de prueba no existe la cookie de refresh: la sesión simulada vive en el navegador.
  if (env.NEXT_PUBLIC_USE_MOCKS) return NextResponse.next();

  if (isProtected(pathname) && !request.cookies.has(REFRESH_COOKIE_NAME)) {
    const loginUrl = new URL(ROUTES.login, request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
