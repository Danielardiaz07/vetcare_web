import { z, type ZodType } from "zod";
import { API_PREFIX, ErrorCode, REFRESH_COOKIE_NAME } from "@/config/constants";
import { OPERATIONS, TAGS, type Operation } from "@/routes/v1/openapi/operations";

type JsonSchema = Record<string, unknown>;

// Las entradas se documentan tal como llegan (antes de transformaciones como convertir una fecha en Date).
function toJsonSchema(schema: ZodType): JsonSchema {
  const jsonSchema = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io: "input",
    unrepresentable: "any",
  }) as JsonSchema;
  delete jsonSchema.$schema; // el documento OpenAPI ya declara su dialecto
  return withoutRedundantPatterns(jsonSchema);
}

// Zod acompaña cada `format` (fecha, correo, UUID) con la expresión regular que usa para validarlo: es ruido en la
// interfaz, porque el formato ya lo dice todo.
function withoutRedundantPatterns<T>(node: T): T {
  if (Array.isArray(node)) return node.map(withoutRedundantPatterns) as T;
  if (node === null || typeof node !== "object") return node;
  const entries = Object.entries(node as Record<string, unknown>);
  const hasFormat = entries.some(([key]) => key === "format");
  return Object.fromEntries(
    entries
      .filter(([key]) => !(hasFormat && key === "pattern"))
      .map(([key, value]) => [key, withoutRedundantPatterns(value)]),
  ) as T;
}

function queryParameters(schema: ZodType) {
  const { properties = {}, required = [] } = toJsonSchema(schema) as {
    properties?: Record<string, JsonSchema>;
    required?: string[];
  };
  return Object.entries(properties).map(([name, property]) => ({
    name,
    in: "query",
    required: required.includes(name),
    ...(typeof property.description === "string" && { description: property.description }),
    schema: property,
  }));
}

function pathParameters(path: string) {
  return [...path.matchAll(/\{(\w+)\}/g)].map(([, name]) => ({
    name,
    in: "path",
    required: true,
    description:
      name === "type"
        ? "Tipo de cita: GENERAL_CONSULTATION, VACCINATION, CHECKUP o GROOMING."
        : "Identificador (UUID).",
    schema: name === "type" ? { type: "string" } : { type: "string", format: "uuid" },
  }));
}

const errorResponse = (description: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
});

const SUCCESS_TEXT: Record<Operation["success"], string> = {
  200: "Operación exitosa.",
  201: "Creado.",
  204: "Operación exitosa, sin contenido.",
};

function accessDescription(operation: Operation): string {
  if (operation.access === "public") return "Público: no requiere sesión.";
  if (operation.access === "authenticated") return "Requiere sesión (cualquier rol).";
  return `Requiere sesión con rol: ${operation.access.join(", ")}.`;
}

function operationObject(operation: Operation) {
  const parameters = [
    ...pathParameters(operation.path),
    ...(operation.query ? queryParameters(operation.query) : []),
  ];
  const hasInput = Boolean(operation.body) || Boolean(operation.query) || parameters.length > 0;
  const restricted = Array.isArray(operation.access);

  return {
    operationId: `${operation.method}${operation.path.replace(/[^a-zA-Z0-9]+(\w)/g, (_, c: string) => c.toUpperCase())}`,
    tags: [operation.tag],
    summary: operation.summary,
    description: [operation.description, accessDescription(operation)].filter(Boolean).join("\n\n"),
    ...(operation.access === "public" && !operation.cookie
      ? { security: [] }
      : { security: [operation.cookie ? { refreshCookie: [] } : { bearerAuth: [] }] }),
    ...(restricted && { "x-roles": operation.access }),
    ...(parameters.length > 0 && { parameters }),
    ...(operation.body && {
      requestBody: {
        required: true,
        content: { "application/json": { schema: toJsonSchema(operation.body) } },
      },
    }),
    responses: {
      [operation.success]: { description: SUCCESS_TEXT[operation.success] },
      ...(hasInput && { 400: errorResponse("Datos inválidos (VALIDATION_ERROR).") }),
      ...(operation.access !== "public" && {
        401: errorResponse("Sin sesión o con el token vencido."),
      }),
      ...(restricted && { 403: errorResponse("El rol no tiene permiso para esta operación.") }),
      ...(operation.path.includes("{") && { 404: errorResponse("El recurso no existe.") }),
      ...(operation.rateLimited && {
        429: errorResponse("Demasiados intentos; espera e intenta de nuevo."),
      }),
      ...(operation.path === "/health/db" && {
        503: errorResponse("La base de datos no responde."),
      }),
    },
  };
}

const DESCRIPTION = `API REST de **VetCare**, el sistema de gestión de clínicas veterinarias con portal del propietario.

## Cómo autenticarse
1. Llama a \`POST /auth/login\` con correo y contraseña. La respuesta trae \`accessToken\` (vale 15 minutos).
2. Pulsa **Authorize** y pega ese token. Las demás operaciones lo envían como \`Authorization: Bearer <token>\`.
3. Cuando venza, \`POST /auth/refresh\` entrega uno nuevo usando la cookie \`${REFRESH_COOKIE_NAME}\` (httpOnly, 7 días) que dejó el inicio de sesión.

## Roles
\`OWNER\` (propietario), \`RECEPTIONIST\`, \`VETERINARIAN\`, \`GROOMER\` (estilista) y \`ADMIN\`. Cada operación indica cuáles puede usar; el propietario solo accede a sus propios datos.

## Convenciones
- **Errores:** siempre \`{ "error": { "code", "message", "details" } }\`.
- **Listas paginadas:** reciben \`page\` y \`limit\` y responden \`{ "data": [...], "meta": { "page", "limit", "total", "totalPages" } }\`.
- **Fechas** de calendario en formato \`AAAA-MM-DD\` (hora de Colombia, UTC−5); los instantes, en ISO 8601.
- **Dinero** en pesos colombianos (COP), con hasta 2 decimales; las facturas llevan IVA del 19 %.
- Las respuestas exitosas se describen por código de estado; los datos que devuelve cada operación están en el documento de arquitectura del proyecto.`;

export function buildOpenApiSpec() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const operation of OPERATIONS) {
    (paths[operation.path] ??= {})[operation.method] = operationObject(operation);
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "VetCare API",
      version: "1.0.0",
      description: DESCRIPTION,
    },
    servers: [{ url: API_PREFIX, description: "Servidor actual" }],
    tags: Object.values(TAGS).map((name) => ({ name })),
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        refreshCookie: { type: "apiKey", in: "cookie", name: REFRESH_COOKIE_NAME },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message", "details"],
              properties: {
                code: { type: "string", enum: Object.values(ErrorCode) },
                message: {
                  type: "string",
                  description: "Mensaje en español que indica cómo corregir.",
                },
                details: {
                  type: "array",
                  items: {},
                  description: "Detalle por campo en los errores de validación.",
                },
              },
            },
          },
        },
      },
    },
  };
}
