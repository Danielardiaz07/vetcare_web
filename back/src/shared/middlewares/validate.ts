import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "@/shared/errors";

interface RequestSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

const SOURCES = ["body", "query", "params"] as const;

// Express 5 expone req.query como getter; se redefine para entregar el valor ya parseado.
export const validate =
  (schemas: RequestSchemas): RequestHandler =>
  (req, _res, next) => {
    const details: unknown[] = [];

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source]);
      if (!result.success) {
        details.push(
          ...result.error.issues.map((issue) => ({
            source,
            path: issue.path.join("."),
            message: issue.message,
          })),
        );
        continue;
      }
      Object.defineProperty(req, source, {
        value: result.data,
        writable: true,
        configurable: true,
      });
    }

    next(details.length > 0 ? new ValidationError(undefined, details) : undefined);
  };
