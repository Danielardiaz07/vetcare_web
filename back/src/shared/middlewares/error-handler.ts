import type { ErrorRequestHandler, RequestHandler } from "express";
import { ErrorCode, HttpStatus } from "@/config/constants";
import { logger } from "@/config/logger";
import { AppError, NotFoundError } from "@/shared/errors";

const BODY_PARSE_FAILED = "entity.parse.failed";

function isBodyParseError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === BODY_PARSE_FAILED
  );
}

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError("Ruta no encontrada"));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: { code: error.code, message: error.message, details: error.details },
    });
    return;
  }

  if (isBodyParseError(error)) {
    res.status(HttpStatus.BAD_REQUEST).json({
      error: {
        code: ErrorCode.INVALID_JSON,
        message: "El cuerpo no es un JSON valido",
        details: [],
      },
    });
    return;
  }

  logger.error({ err: error }, "Unhandled error");
  res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
    error: { code: ErrorCode.INTERNAL_ERROR, message: "Error interno del servidor", details: [] },
  });
};
