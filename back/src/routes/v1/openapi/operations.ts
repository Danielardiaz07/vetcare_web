import { Role } from "@prisma/client";
import type { ZodType } from "zod";
import {
  agendaQuerySchema,
  availabilityQuerySchema,
  cancelAppointmentRequestSchema,
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
    "/me/patients/{id}/grooming-services",
    TAGS.portal,
    "Ver los servicios de estética de mi mascota",
    [OWNER],
    200,
  ),
  op("get", "/me/appointments", TAGS.portal, "Listar mis citas", [OWNER], 200, {
    query: listMyAppointmentsQuerySchema,
  }),
  op("get", "/me/invoices", TAGS.portal, "Listar mis facturas", [OWNER], 200, {
    query: listMyInvoicesQuerySchema,
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
    "authenticated",
    200,
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
    "authenticated",
    200,
    {
      query: availabilityQuerySchema,
      description: "Si ese día no hay franjas, sugiere hasta 3 fechas cercanas (RN-33).",
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
      "Citas por estado, inasistencias, servicios más solicitados, ingresos, altas, internaciones abiertas y vacunas vencidas. Sin fechas, los últimos 30 días; máximo 366 (RN-80).",
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
