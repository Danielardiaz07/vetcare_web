export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  portal: "/portal",
  panel: "/panel",
} as const;

export const PROTECTED_ROUTE_PREFIXES = [ROUTES.portal, ROUTES.panel] as const;

export const REFRESH_COOKIE_NAME = "refresh_token";

export const API_REFRESH_PATH = "/auth/refresh";
