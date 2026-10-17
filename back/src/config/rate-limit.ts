import type { Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import {
  LOGIN_RATE_LIMIT_MAX,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS,
  REGISTER_RATE_LIMIT_MAX,
  REGISTER_RATE_LIMIT_WINDOW_MS,
} from "@/config/constants";
import { TooManyRequestsError } from "@/shared/errors";

const baseOptions = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req: Request, _res: unknown, next: (error: unknown) => void) =>
    next(new TooManyRequestsError()),
} as const;

// Combina IP y correo para que un atacante no agote el límite de otros usuarios ni evada el suyo.
const ipAndEmailKey = (req: Request): string => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  return `${ipKeyGenerator(req.ip ?? "")}|${email}`;
};

export const globalRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: RATE_LIMIT_MAX_REQUESTS,
});

export const loginRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: LOGIN_RATE_LIMIT_MAX,
  keyGenerator: ipAndEmailKey,
});

export const registerRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: REGISTER_RATE_LIMIT_WINDOW_MS,
  limit: REGISTER_RATE_LIMIT_MAX,
  keyGenerator: ipAndEmailKey,
});
