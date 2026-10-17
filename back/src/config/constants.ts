export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_JSON: "INVALID_JSON",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export const API_PREFIX = "/api/v1";
export const JSON_BODY_LIMIT = "100kb";

const MINUTE_MS = 60 * 1000;
export const RATE_LIMIT_WINDOW_MS = 15 * MINUTE_MS;
export const RATE_LIMIT_MAX_REQUESTS = 100;
export const LOGIN_RATE_LIMIT_MAX = 5;
export const REGISTER_RATE_LIMIT_WINDOW_MS = 10 * MINUTE_MS;
export const REGISTER_RATE_LIMIT_MAX = 5;

export const REFRESH_COOKIE_NAME = "refresh_token";
export const JWT_ALGORITHM = "HS256";

export const OTP_LENGTH = 6;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MS = 15 * MINUTE_MS;

// Los mismos límites que las columnas (@db.VarChar) y que el maxLength del formulario.
export const FieldLimit = {
  EMAIL_MAX: 254,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 72,
  DOCUMENT_NUMBER_MIN: 6,
  DOCUMENT_NUMBER_MAX: 10,
  NAME_MAX: 60,
  PHONE_DIGITS: 10,
  ADDRESS_MAX: 100,
  PATIENT_NAME_MAX: 60,
  BREED_MAX: 60,
  WEIGHT_KG_MAX: 999.99,
  SEARCH_MAX: 60,
} as const;

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Se antepone al teléfono de 10 dígitos para guardarlo en E.164 sin "+".
export const COLOMBIA_PHONE_PREFIX = "57";

// Hash válido de una contraseña descartada: iguala el tiempo de respuesta cuando el correo no existe.
export const DUMMY_PASSWORD_HASH = "$2b$12$BdZkdJ53EYi0HU14FFI8FeiCcLMDkcM0dJxCa6yVf5tipdVLPRoj2";
