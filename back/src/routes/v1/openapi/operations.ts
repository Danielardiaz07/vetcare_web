import { Role } from "@prisma/client";
import type { ZodType } from "zod";
import {
  agendaQuerySchema,
  availabilityQuerySchema,
  cancelAppointmentRequestSchema,
  cancelByLinkRequestSchema,
  checkInRequestSchema,
  createAppointmentRequestSchema,
  listMyAppointmentsQuerySchema,
  reassignAppointmentRequestSchema,
  rescheduleAppointmentRequestSchema,
} from "@/modules/appointments/dto/appointments.dto";
import { updateAppointmentTypeRequestSchema } from "@/modules/appointments/dto/appointment-types.dto";
import {
  forgotPasswordRequestSchema,
  loginRequestSchema,
  otpResendRequestSchema,
  otpVerifyRequestSchema,
  registerRequestSchema,
  resetPasswordRequestSchema,
} from "@/modules/auth/dto/auth.dto";
import {
  createConsultationRequestSchema,
  createHospitalizationRequestSchema,
  createLabExamRequestSchema,
  createSurgeryRequestSchema,
  createVaccinationRequestSchema,
  createVaccineRequestSchema,
  dischargeHospitalizationRequestSchema,
  historyQuerySchema,
  listHospitalizationsQuerySchema,
} from "@/modules/clinical/dto/clinical.dto";
import { createGroomingServiceRequestSchema } from "@/modules/grooming/dto/grooming.dto";
import {
  createMedicationRequestSchema,
  listInventoryQuerySchema,
  updateMedicationRequestSchema,
  updateVaccineRequestSchema,
} from "@/modules/inventory/dto/inventory.dto";
import {
  createInvoiceRequestSchema,
  listInvoicesQuerySchema,
  listMyInvoicesQuerySchema,
  pendingQuerySchema,
  voidInvoiceRequestSchema,
} from "@/modules/invoices/dto/invoices.dto";
import { listNotificationsQuerySchema } from "@/modules/notifications/dto/notifications.dto";
import {
  createOwnerRequestSchema,
  listOwnersQuerySchema,
  updateOwnerRequestSchema,
} from "@/modules/owners/dto/owners.dto";
import {
  createMyPatientRequestSchema,
  createPatientRequestSchema,
  listMyPatientsQuerySchema,
  listPatientsQuerySchema,
  updatePatientRequestSchema,
} from "@/modules/patients/dto/patients.dto";
import { dashboardQuerySchema } from "@/modules/reports/dto/reports.dto";
import {
  createGroomerRequestSchema,
  createVeterinarianRequestSchema,
  listPublicStaffQuerySchema,
  listStaffQuerySchema,
  replaceSchedulesRequestSchema,
  updateGroomerRequestSchema,
  updateVeterinarianRequestSchema,
} from "@/modules/staff/dto/staff.dto";
import {
  changePasswordRequestSchema,
  createStaffUserRequestSchema,
  listStaffUsersQuerySchema,
  updateMyContactRequestSchema,
  updateStaffUserRequestSchema,
} from "@/modules/users/dto/users.dto";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

// "public" = sin sesión; "authenticated" = cualquier sesión; una lista = solo esos roles.
export type Access = "public" | "authenticated" | readonly Role[];

export interface Operation {
  method: HttpMethod;
  path: string; // formato OpenAPI: /owners/{id}
  tag: string;
  summary: string;
  description?: string;
  access: Access;
  success: 200 | 201 | 204;
  body?: ZodType;
  query?: ZodType;
  rateLimited?: boolean;
  cookie?: boolean; // usa la cookie refresh_token en vez del token de acceso
}

const { OWNER, RECEPTIONIST, VETERINARIAN, GROOMER, ADMIN } = Role;

export const TAGS = {
  health: "Salud",
  auth: "Autenticación",
  users: "Usuarios",
  owners: "Propietarios",
  patients: "Pacientes",
  portal: "Portal del propietario",
  staff: "Personal y horarios",
  appointments: "Citas",
  clinical: "Atención clínica",
  grooming: "Estética",
  invoices: "Facturación",
  inventory: "Inventario",
  notifications: "Notificaciones",
  reports: "Indicadores",
} as const;

const op = (
  method: HttpMethod,
  path: string,
  tag: string,
  summary: string,
  access: Access,
  success: Operation["success"],
  extra: Partial<Operation> = {},
): Operation => ({ method, path, tag, summary, access, success, ...extra });

// Mismas rutas para /veterinarians y /groomers: forma y permisos idénticos.
function staffOperations(
  prefix: "/veterinarians" | "/groomers",
  noun: string,
  createSchema: ZodType,
  updateSchema: ZodType,
): Operation[] {
  const admin = [ADMIN] as const;
  return [
    op("post", prefix, TAGS.staff, `Registrar ${noun}`, admin, 201, { body: createSchema }),
    op("get", prefix, TAGS.staff, `Listar ${noun}s`, "authenticated", 200, {
      query: listStaffQuerySchema,
    }),
    op("get", `${prefix}/public`, TAGS.staff, `Listar ${noun}s activos (público)`, "public", 200, {
      query: listPublicStaffQuerySchema,
      description:
        "Sin sesión (D-51). Solo profesionales activos, con id, nombres, apellidos y especialidad (veterinarios); nunca documento, teléfono ni cuenta.",
    }),
    op("get", `${prefix}/{id}`, TAGS.staff, `Ver ${noun}`, "authenticated", 200),
    op("patch", `${prefix}/{id}`, TAGS.staff, `Editar o desactivar ${noun}`, admin, 200, {
      body: updateSchema,
    }),
    op(
      "get",
      `${prefix}/{id}/schedules`,
      TAGS.staff,
      `Ver el horario semanal de ${noun}`,
      "authenticated",
      200,
    ),
    op(
      "put",
      `${prefix}/{id}/schedules`,
      TAGS.staff,
      `Reemplazar el horario semanal de ${noun}`,
      admin,
      200,
      {
        body: replaceSchedulesRequestSchema,
        description:
          "Reemplaza el horario completo. Los bloques deben alinearse a franjas de 30 minutos y no solaparse (RN-19).",
      },
    ),
  ];
}

export const OPERATIONS: Operation[] = [
  // Salud
  op("get", "/health", TAGS.health, "La API está viva", "public", 200, {
    description: "Lo usa Render como health check. No consulta la base de datos.",
  }),
  op("get", "/health/db", TAGS.health, "Chequeo de salud con base de datos", "public", 200, {
    description:
      "Hace un SELECT 1 con tope de 8 s. Responde 503 con un cuerpo genérico si la base no responde (D-39).",
  }),

  // Autenticación
  op("post", "/auth/register", TAGS.auth, "Registrar un propietario", "public", 201, {
    body: registerRequestSchema,
    rateLimited: true,
    description:
      "Crea la cuenta en estado PENDING y envía un código de verificación al correo (RN-01 a RN-05).",
  }),
  op("post", "/auth/otp/verify", TAGS.auth, "Verificar el código del correo", "public", 204, {
    body: otpVerifyRequestSchema,
    rateLimited: true,
  }),
  op("post", "/auth/otp/resend", TAGS.auth, "Reenviar el código de verificación", "public", 204, {
    body: otpResendRequestSchema,
    rateLimited: true,
  }),
  op("post", "/auth/login", TAGS.auth, "Iniciar sesión", "public", 200, {
    body: loginRequestSchema,
    rateLimited: true,
    description:
      "Devuelve el token de acceso (15 minutos) y guarda el de renovación en la cookie httpOnly `refresh_token` (7 días). Tras 5 intentos fallidos la cuenta se bloquea 15 minutos (RN-08).",
  }),
  op("post", "/auth/refresh", TAGS.auth, "Renovar la sesión", "public", 200, {
    cookie: true,
    description:
      "Rota el token de renovación y devuelve un token de acceso nuevo. Reutilizar un token ya revocado cierra todas las sesiones (RN-10).",
  }),
  op("post", "/auth/logout", TAGS.auth, "Cerrar sesión", "public", 204, { cookie: true }),
  op(
    "post",
    "/auth/password/forgot",
    TAGS.auth,
    "Pedir el enlace para recuperar la contraseña",
    "public",
    200,
    {
      body: forgotPasswordRequestSchema,
      rateLimited: true,
      description:
        "Se identifica por correo o por cédula (uno solo). Responde siempre lo mismo, exista o no la cuenta; el enlace va al correo registrado y vence en 30 minutos (RN-11).",
    },
  ),
  op(
    "post",
    "/auth/password/reset",
    TAGS.auth,
    "Restablecer la contraseña con el enlace",
    "public",
    204,
    {
      body: resetPasswordRequestSchema,
      rateLimited: true,
      description:
        "El enlace sirve una sola vez. Al cambiar la contraseña se cierran todas las sesiones y se quita el bloqueo.",
    },
  ),

  // Usuarios
  op("get", "/users/me", TAGS.users, "Ver mi perfil", "authenticated", 200, {
    description:
      "Incluye owner, veterinarian o groomer según la cuenta; los que no aplican vienen en null (recepción y administración no tienen perfil, D-44).",
  }),
  op("patch", "/users/me", TAGS.users, "Actualizar mi contacto", [OWNER], 200, {
    body: updateMyContactRequestSchema,
    description: "Solo teléfono y dirección. El correo y la cédula se cambian en recepción (D-18).",
  }),
  op("put", "/users/me/password", TAGS.users, "Cambiar mi contraseña", "authenticated", 204, {
    body: changePasswordRequestSchema,
    rateLimited: true,
    description:
      "Pide la contraseña actual y cierra las demás sesiones, conservando la actual (D-32).",
  }),
  op("post", "/users", TAGS.users, "Crear una cuenta del personal", [ADMIN], 201, {
    body: createStaffUserRequestSchema,
  }),
  op("get", "/users", TAGS.users, "Listar las cuentas del personal", [ADMIN], 200, {
    query: listStaffUsersQuerySchema,
  }),
  op("get", "/users/{id}", TAGS.users, "Ver una cuenta del personal", [ADMIN], 200),
  op(
    "patch",
    "/users/{id}",
    TAGS.users,
    "Editar, suspender o cambiar la contraseña de una cuenta",
    [ADMIN],
    200,
    {
      body: updateStaffUserRequestSchema,
      description:
        "Suspender una cuenta cierra sus sesiones. El administrador no puede suspenderse ni cambiarse el rol a sí mismo (RN-12), ni cambiar su propia contraseña aquí: lo hace desde Mi cuenta, que pide la actual.",
    },
  ),

  // Propietarios
  op("post", "/owners", TAGS.owners, "Registrar un propietario", [RECEPTIONIST], 201, {
    body: createOwnerRequestSchema,
  }),
  op("get", "/owners", TAGS.owners, "Listar propietarios", [RECEPTIONIST], 200, {
    query: listOwnersQuerySchema,
  }),
  op("get", "/owners/{id}", TAGS.owners, "Ver un propietario", [RECEPTIONIST], 200),
  op("patch", "/owners/{id}", TAGS.owners, "Editar un propietario", [RECEPTIONIST], 200, {
    body: updateOwnerRequestSchema,
    description:
      "La cédula no se edita. Cambiar el correo actualiza también el de su cuenta (D-18).",
  }),
  op("delete", "/owners/{id}", TAGS.owners, "Desactivar un propietario", [RECEPTIONIST], 204, {
    description: "Eliminación lógica: se conserva el historial (RN-14).",
  }),

  // Pacientes
  op(
    "post",
    "/patients",
    TAGS.patients,
    "Registrar una mascota",
    [RECEPTIONIST, VETERINARIAN],
    201,
    {
      body: createPatientRequestSchema,
    },
  ),
  op("get", "/patients", TAGS.patients, "Listar mascotas", [RECEPTIONIST, VETERINARIAN], 200, {
    query: listPatientsQuerySchema,
  }),
  op("get", "/patients/{id}", TAGS.patients, "Ver una mascota", [RECEPTIONIST, VETERINARIAN], 200),
  op(
    "patch",
    "/patients/{id}",
    TAGS.patients,
    "Editar o desactivar una mascota",
    [RECEPTIONIST, VETERINARIAN],
    200,
    {
      body: updatePatientRequestSchema,
    },
  ),
  op(
    "delete",
    "/patients/{id}",
    TAGS.patients,
    "Desactivar una mascota",
    [RECEPTIONIST, VETERINARIAN],
    204,
  ),

  // Portal del propietario
  op("get", "/me/patients", TAGS.portal, "Listar mis mascotas", [OWNER], 200, {
    query: listMyPatientsQuerySchema,
  }),
  op("post", "/me/patients", TAGS.portal, "Registrar una mascota propia", [OWNER], 201, {
    body: createMyPatientRequestSchema,
    description:
      "El propietario sale de la sesión; si el cuerpo trae `ownerId`, se ignora (RN-18).",
  }),
  op("get", "/me/patients/{id}", TAGS.portal, "Ver una de mis mascotas", [OWNER], 200),
  op(
    "get",
    "/me/patients/{id}/history",
    TAGS.portal,
    "Ver el historial clínico de mi mascota",
    [OWNER],
    200,
    {
      query: historyQuerySchema,
      description:
        "Línea de tiempo de consultas, vacunaciones, cirugías, internaciones y exámenes, de lo más reciente a lo más antiguo. Sin notas internas (RN-42).",
    },
  ),
  op(
    "get",
    "/me/patients/{id}/vaccination-card",
    TAGS.portal,
    "Ver el carné de vacunación de mi mascota",
    [OWNER],
    200,
  ),
  op(
    "get",
    "/me/patients/{id}/weight-trend",
    TAGS.portal,
    "Ver la curva de peso de mi mascota",
    [OWNER],
    200,
    {
      description:
        "Pesos de sus consultas, de la más antigua a la más reciente, y `change` con la última frente a la anterior. `flagged` es true si varió 10 % o más (RN-81, D-55).",
    },
  ),
  op(
    "get",
    "/me/patients/{id}/grooming-services",
    TAGS.portal,
    "Ver los servicios de estética de mi mascota",
    [OWNER],
    200,
  ),
  op(
    "get",
    "/me/patients/{id}/vaccination-card/verification",
    TAGS.portal,
    "Obtener el QR del carné de mi mascota",
    [OWNER],
    200,
    {
      description:
        "Crea el enlace la primera vez. Devuelve `{ active, url, qrSvg }`: `qrSvg` es el QR ya dibujado y `url` la dirección que abre. Si el enlace está desactivado, solo `active: false` (RN-82, D-56).",
    },
  ),
  op(
    "post",
    "/me/patients/{id}/vaccination-card/verification/rotate",
    TAGS.portal,
    "Cambiar el QR del carné de mi mascota",
    [OWNER],
    200,
    {
      description:
        "Genera un enlace nuevo y reactiva el QR. El QR impreso anterior deja de servir (RN-82, D-56).",
    },
  ),
  op(
    "delete",
    "/me/patients/{id}/vaccination-card/verification",
    TAGS.portal,
    "Desactivar el QR del carné de mi mascota",
    [OWNER],
    204,
    { description: "El QR impreso deja de verificar hasta que se genere uno nuevo (RN-82, D-56)." },
  ),
  op(
    "get",
    "/me/appointments/{id}/check-in",
    TAGS.portal,
    "Obtener el QR de llegada de mi cita",
    [OWNER],
    200,
    {
      description:
        "Devuelve `{ appointmentId, code, qrSvg, startsAt }` para una cita programada. Se muestra en recepción el día de la cita (RN-83, D-56).",
    },
  ),
  op("get", "/me/appointments", TAGS.portal, "Listar mis citas", [OWNER], 200, {
    query: listMyAppointmentsQuerySchema,
  }),
  op("get", "/me/invoices", TAGS.portal, "Listar mis facturas", [OWNER], 200, {
    query: listMyInvoicesQuerySchema,
  }),
  op("get", "/me/alerts", TAGS.portal, "Ver mis avisos", [OWNER], 200, {
    description:
      "Centro de avisos (D-52), calculado al consultar: citas de las próximas 48 horas, vacunas vencidas o que vencen en 7 días, cambios de peso de 10 % o más en los últimos 30 días (RN-81) y facturas de los últimos 7 días. Cada aviso trae `id` estable, `kind`, `message` y `date`.",
  }),

  // Personal y horarios
  ...staffOperations(
    "/veterinarians",
    "veterinario",
    createVeterinarianRequestSchema,
    updateVeterinarianRequestSchema,
  ),
  ...staffOperations(
    "/groomers",
    "estilista",
    createGroomerRequestSchema,
    updateGroomerRequestSchema,
  ),
  op(
    "get",
    "/appointment-types",
    TAGS.staff,
    "Ver la duración de cada tipo de cita",
    "public",
    200,
    { description: "Pública para iniciar el agendamiento desde la landing (D-51)." },
  ),
  op(
    "patch",
    "/appointment-types/{type}",
    TAGS.staff,
    "Cambiar la duración de un tipo de cita",
    [ADMIN],
    200,
    {
      body: updateAppointmentTypeRequestSchema,
      description: "La duración es siempre múltiplo de 30 minutos (RN-19).",
    },
  ),

  // Citas
  op(
    "get",
    "/appointments/availability",
    TAGS.appointments,
    "Consultar las franjas libres",
    "public",
    200,
    {
      query: availabilityQuerySchema,
      description:
        "Pública (D-51). Si ese día no hay franjas, sugiere hasta 3 fechas cercanas (RN-33). Crear la cita sigue exigiendo sesión.",
    },
  ),
  op(
    "get",
    "/appointments",
    TAGS.appointments,
    "Ver la agenda",
    [RECEPTIONIST, VETERINARIAN, GROOMER],
    200,
    {
      query: agendaQuerySchema,
      description:
        "Recepción ve la agenda de todos; veterinarios y estilistas, solo la suya. Máximo 7 días.",
    },
  ),
  op("post", "/appointments", TAGS.appointments, "Agendar una cita", [OWNER, RECEPTIONIST], 201, {
    body: createAppointmentRequestSchema,
    description:
      "Con 2 horas de anticipación como mínimo, hasta 30 días y máximo 3 citas activas por mascota. Sin `professionalId` se asigna cualquiera disponible. Envía el correo de confirmación (RN-35).",
  }),
  op(
    "put",
    "/appointments/{id}/reschedule",
    TAGS.appointments,
    "Reprogramar una cita",
    [OWNER, RECEPTIONIST],
    200,
    {
      body: rescheduleAppointmentRequestSchema,
    },
  ),
  op(
    "put",
    "/appointments/{id}/cancel",
    TAGS.appointments,
    "Cancelar una cita",
    [OWNER, RECEPTIONIST],
    200,
    {
      body: cancelAppointmentRequestSchema,
    },
  ),
  op(
    "put",
    "/appointments/{id}/arrival",
    TAGS.appointments,
    "Registrar la llegada del paciente",
    [RECEPTIONIST],
    200,
    {
      description: "La cita pasa de SCHEDULED a CONFIRMED.",
    },
  ),
  op(
    "get",
    "/public/appointments/manage/{token}",
    TAGS.appointments,
    "Ver la cita desde el enlace del correo (público)",
    "public",
    200,
    {
      rateLimited: true,
      description:
        "Sin sesión. El `token` viene en el enlace personal de los correos de la cita (`/manage-appointment/{token}`). Devuelve `{ appointment, canChange, blockedReason }`, sin datos del propietario. `canChange` es false si la cita ya no está activa o faltan 2 horas o menos (RN-28, RN-84, D-65). Un enlace inválido responde 404.",
    },
  ),
  op(
    "post",
    "/public/appointments/manage/{token}/cancel",
    TAGS.appointments,
    "Cancelar la cita desde el enlace del correo (público)",
    "public",
    200,
    {
      body: cancelByLinkRequestSchema,
      rateLimited: true,
      description:
        "Sin sesión. El `reason` es opcional. Aplica las mismas reglas que cancelar desde la cuenta del propietario y envía el correo de cancelación (RN-84, D-65).",
    },
  ),
  op(
    "post",
    "/public/appointments/manage/{token}/reschedule",
    TAGS.appointments,
    "Reprogramar la cita desde el enlace del correo (público)",
    "public",
    200,
    {
      body: rescheduleAppointmentRequestSchema,
      rateLimited: true,
      description:
        "Sin sesión. Las franjas libres salen de `GET /appointments/availability` con el tipo de la cita. Aplica las mismas reglas que reprogramar desde la cuenta del propietario (RN-84, D-65).",
    },
  ),
  op(
    "post",
    "/appointments/check-in",
    TAGS.appointments,
    "Registrar la llegada con el código QR",
    [RECEPTIONIST],
    200,
    {
      body: checkInRequestSchema,
      description:
        "Recibe el `code` que trae el QR del propietario. Solo vale el día de la cita y para una cita programada; hace lo mismo que registrar la llegada a mano. El código lleva la hora de la cita: si se reprogramó, el anterior se rechaza con 409 (RN-83, D-56, D-66).",
    },
  ),
  op(
    "get",
    "/appointments/events",
    TAGS.appointments,
    "Canal de eventos de la agenda de recepción (SSE)",
    [RECEPTIONIST],
    200,
    {
      description:
        "Conexión `text/event-stream` autenticada con el JWT en `Authorization` (el `EventSource` del navegador no envía cabeceras: usa `fetch` con lectura de la respuesta). Emite `appointment.changed` con `{ appointmentId }` tras guardar una creación, reprogramación, cancelación, reasignación o cambio de estado (llegada manual o por QR, no asistió, consulta, vacunación o servicio de estética que cierra la cita). El cliente vuelve a consultar la agenda al recibirlo. Envía un comentario `: keep-alive` cada 25 s y cierra la conexión a los 10 minutos para que el cliente se reconecte con un token vigente; al reconectar conviene consultar la agenda, porque los avisos perdidos no se reenvían (D-69).",
    },
  ),
  op(
    "get",
    "/appointments/check-in/scanner-access",
    TAGS.appointments,
    "Obtener el enlace y el QR fijo del escáner de recepción",
    [RECEPTIONIST],
    200,
    {
      description:
        "Devuelve `{ url, qrSvg }`: el enlace `<FRONTEND_URL>/scan/<token>` y su QR ya dibujado. Lee `CHECK_IN_SCANNER_TOKEN` sin crearlo ni cambiarlo; la respuesta lleva `Cache-Control: no-store`. 404 si falta el token o `FRONTEND_URL` no es HTTPS (RN-85, D-68).",
    },
  ),
  op(
    "get",
    "/public/check-in/{scannerToken}",
    TAGS.appointments,
    "Comprobar el enlace de escaneo de recepción (público)",
    "public",
    204,
    {
      rateLimited: true,
      description:
        "Sin sesión. Responde 204 si el `scannerToken` del enlace de escaneo es válido y 404 si no, o si la página de escaneo está desactivada (RN-85, D-66).",
    },
  ),
  op(
    "post",
    "/public/check-in/{scannerToken}",
    TAGS.appointments,
    "Registrar la llegada desde la página de escaneo (público)",
    "public",
    200,
    {
      body: checkInRequestSchema,
      rateLimited: true,
      description:
        "Sin sesión: la autoriza el `scannerToken` del enlace. Mismas reglas que `POST /appointments/check-in`, pero devuelve solo `{ patientName, startsAt }` (RN-83, RN-85, D-66).",
    },
  ),
  op(
    "get",
    "/public/check-in-qr/{file}",
    TAGS.appointments,
    "Imagen PNG del QR de llegada (público)",
    "public",
    200,
    {
      rateLimited: true,
      description:
        "Sin sesión. `file` es el código de llegada con extensión `.png`; solo se dibuja si la firma es auténtica, si no responde 404. La usa el correo de recordatorio (D-66).",
    },
  ),
  op(
    "put",
    "/appointments/{id}/no-show",
    TAGS.appointments,
    "Marcar la inasistencia",
    [RECEPTIONIST],
    200,
    {
      description: "Solo desde 15 minutos después de la hora de la cita.",
    },
  ),
  op(
    "put",
    "/appointments/{id}/reassign",
    TAGS.appointments,
    "Reasignar el profesional",
    [RECEPTIONIST],
    200,
    {
      body: reassignAppointmentRequestSchema,
    },
  ),

  // Atención clínica
  op("post", "/consultations", TAGS.clinical, "Registrar una consulta", [VETERINARIAN], 201, {
    body: createConsultationRequestSchema,
    description:
      "Solo el veterinario asignado y sobre una cita CONFIRMED. En una sola transacción: guarda la consulta, pasa la cita a ATTENDED y actualiza el peso (RN-43 a RN-46).",
  }),
  op("get", "/vaccines", TAGS.clinical, "Listar el catálogo de vacunas", "authenticated", 200, {
    description:
      "Solo las vacunas activas, sin stock ni vencimiento (esos datos son del inventario).",
  }),
  op("post", "/vaccines", TAGS.clinical, "Agregar una vacuna al catálogo", [ADMIN], 201, {
    body: createVaccineRequestSchema,
  }),
  op("post", "/vaccinations", TAGS.clinical, "Registrar una vacunación", [VETERINARIAN], 201, {
    body: createVaccinationRequestSchema,
    description: "Con `appointmentId`, la vacunación cierra la cita como ATTENDED (RN-53).",
  }),
  op("post", "/surgeries", TAGS.clinical, "Registrar una cirugía", [VETERINARIAN], 201, {
    body: createSurgeryRequestSchema,
  }),
  op(
    "post",
    "/lab-exams",
    TAGS.clinical,
    "Registrar un examen de laboratorio",
    [VETERINARIAN],
    201,
    {
      body: createLabExamRequestSchema,
    },
  ),
  op(
    "post",
    "/hospitalizations",
    TAGS.clinical,
    "Registrar el ingreso a internación",
    [VETERINARIAN],
    201,
    {
      body: createHospitalizationRequestSchema,
      description:
        "El ingreso toma la hora del servidor. Una mascota no puede tener dos internaciones abiertas.",
    },
  ),
  op(
    "get",
    "/hospitalizations",
    TAGS.clinical,
    "Listar internaciones",
    [RECEPTIONIST, VETERINARIAN],
    200,
    {
      query: listHospitalizationsQuerySchema,
    },
  ),
  op(
    "put",
    "/hospitalizations/{id}/discharge",
    TAGS.clinical,
    "Dar de alta una internación",
    [VETERINARIAN],
    200,
    {
      body: dischargeHospitalizationRequestSchema,
    },
  ),
  op(
    "get",
    "/patients/{id}/history",
    TAGS.clinical,
    "Ver el historial clínico de una mascota",
    [RECEPTIONIST, VETERINARIAN],
    200,
    {
      query: historyQuerySchema,
      description: "Incluye las notas internas de las consultas (RN-42).",
    },
  ),
  op(
    "get",
    "/patients/{id}/vaccination-card",
    TAGS.clinical,
    "Ver el carné de vacunación de una mascota",
    [RECEPTIONIST, VETERINARIAN],
    200,
  ),
  op(
    "get",
    "/patients/{id}/weight-trend",
    TAGS.clinical,
    "Ver la curva de peso de una mascota",
    [RECEPTIONIST, VETERINARIAN],
    200,
    {
      description:
        "Pesos de sus consultas, de la más antigua a la más reciente, y `change` con la última frente a la anterior. `flagged` es true si varió 10 % o más (RN-81, D-55).",
    },
  ),
  op(
    "get",
    "/patients/{id}/vaccination-card/verification",
    TAGS.clinical,
    "Obtener el QR del carné de una mascota",
    [RECEPTIONIST, VETERINARIAN],
    200,
    {
      description:
        "Para imprimir el carné. Crea el enlace la primera vez y devuelve `{ active, url, qrSvg }` (RN-82, D-56).",
    },
  ),
  op(
    "get",
    "/public/vaccination-cards/{token}",
    TAGS.clinical,
    "Verificar un carné de vacunación (público)",
    "public",
    200,
    {
      description:
        "Sin sesión. Lo abre quien escanea el QR. Devuelve solo el nombre y la especie de la mascota y el estado de sus vacunas, calculado en el momento; nunca datos del propietario ni historial clínico. Un enlace desconocido o desactivado responde 404 (RN-82, D-56).",
    },
  ),

  // Estética
  op(
    "post",
    "/grooming-services",
    TAGS.grooming,
    "Registrar un servicio de estética",
    [GROOMER],
    201,
    {
      body: createGroomingServiceRequestSchema,
      description:
        "Con `appointmentId`, debe ser una cita de estética confirmada del estilista; la cierra como ATTENDED (RN-51).",
    },
  ),
  op(
    "get",
    "/patients/{id}/grooming-services",
    TAGS.grooming,
    "Ver los servicios de estética de una mascota",
    [RECEPTIONIST, VETERINARIAN, GROOMER],
    200,
  ),

  // Facturación
  op(
    "get",
    "/invoices/pending",
    TAGS.invoices,
    "Ver los conceptos pendientes de facturar",
    [RECEPTIONIST],
    200,
    {
      query: pendingQuerySchema,
      description:
        "Consultas, vacunaciones y servicios de estética sin facturar de un propietario (RN-70).",
    },
  ),
  op("post", "/invoices", TAGS.invoices, "Generar una factura", [RECEPTIONIST], 201, {
    body: createInvoiceRequestSchema,
    description:
      "El IVA del 19 % se calcula por línea. La factura nace PAID y numerada (FAC-000001) (RN-70 a RN-75).",
  }),
  op("get", "/invoices", TAGS.invoices, "Listar facturas", [RECEPTIONIST, ADMIN], 200, {
    query: listInvoicesQuerySchema,
  }),
  op("get", "/invoices/{id}", TAGS.invoices, "Ver una factura", [RECEPTIONIST, ADMIN, OWNER], 200, {
    description: "El propietario solo ve las suyas.",
  }),
  op("put", "/invoices/{id}/void", TAGS.invoices, "Anular una factura", [ADMIN], 200, {
    body: voidInvoiceRequestSchema,
    description: "Libera sus conceptos para facturarlos de nuevo (RN-74).",
  }),

  // Indicadores
  op("get", "/reports/dashboard", TAGS.reports, "Tablero de indicadores", [ADMIN], 200, {
    query: dashboardQuerySchema,
    description:
      "Citas por estado, inasistencias, servicios más solicitados, ingresos, altas, internaciones abiertas y vacunas vencidas. Sin fechas, los últimos 30 días; máximo 366 (RN-80). `previous` trae el periodo anterior de la misma duración para comparar (D-53).",
  }),
  op("get", "/reports/dashboard/export", TAGS.reports, "Exportar el tablero a CSV", [ADMIN], 200, {
    query: dashboardQuerySchema,
    description:
      "Mismos parámetros y datos del tablero, como archivo CSV (UTF-8 con BOM, separado por punto y coma, coma decimal) que abre Excel. Se descarga con el token de acceso (D-53).",
  }),

  // Inventario
  op("get", "/inventory/alerts", TAGS.inventory, "Ver las alertas de inventario", [ADMIN], 200, {
    description:
      "Productos activos con stock crítico (stock menor o igual al mínimo), por vencer (30 días) o vencidos (RN-56).",
  }),
  op("get", "/inventory/medications", TAGS.inventory, "Listar medicamentos", [ADMIN], 200, {
    query: listInventoryQuerySchema,
  }),
  op("post", "/inventory/medications", TAGS.inventory, "Crear un medicamento", [ADMIN], 201, {
    body: createMedicationRequestSchema,
  }),
  op(
    "patch",
    "/inventory/medications/{id}",
    TAGS.inventory,
    "Editar un medicamento",
    [ADMIN],
    200,
    {
      body: updateMedicationRequestSchema,
      description: "`expiresAt: null` borra el vencimiento. El stock nunca queda negativo (RN-57).",
    },
  ),
  op(
    "get",
    "/inventory/vaccines",
    TAGS.inventory,
    "Listar vacunas con su inventario",
    [ADMIN],
    200,
    {
      query: listInventoryQuerySchema,
    },
  ),
  op(
    "patch",
    "/inventory/vaccines/{id}",
    TAGS.inventory,
    "Editar el inventario de una vacuna",
    [ADMIN],
    200,
    {
      body: updateVaccineRequestSchema,
    },
  ),

  // Notificaciones
  op("get", "/notifications", TAGS.notifications, "Ver el registro de correos", [ADMIN], 200, {
    query: listNotificationsQuerySchema,
  }),
  op(
    "post",
    "/notifications/run",
    TAGS.notifications,
    "Ejecutar el envío de recordatorios",
    [ADMIN],
    200,
    {
      description:
        "Encola los recordatorios de 24 h y los avisos de vacuna y entrega los pendientes. Es lo mismo que hace el programador (D-38).",
    },
  ),
];
