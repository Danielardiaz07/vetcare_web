import type { RequestHandler } from "express";
import { UnauthorizedError } from "@/shared/errors";
import type { ITokenService } from "@/shared/providers";
import type { Role } from "@prisma/client";

const BEARER_PREFIX = "Bearer ";

export const authenticate =
  (tokens: ITokenService): RequestHandler =>
  (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
      next(new UnauthorizedError());
      return;
    }

    try {
      const { sub, role } = tokens.verifyAccess(header.slice(BEARER_PREFIX.length));
      req.user = { id: sub, role: role as Role };
      next();
    } catch (error) {
      next(error);
    }
  };
