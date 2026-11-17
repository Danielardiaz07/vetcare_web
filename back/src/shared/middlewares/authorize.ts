import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";
import { ForbiddenError, UnauthorizedError } from "@/shared/errors";

export const authorize =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    next(allowed.includes(req.user.role) ? undefined : new ForbiddenError());
  };
