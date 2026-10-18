export const ROUTES = {
  home: "/",
  login: "/login",
  register: "/register",
  portal: "/portal",
  portalAppointments: "/portal/appointments",
  portalNewAppointment: "/portal/appointments/new",
  portalHistory: "/portal/history",
  portalPetHistory: (petId: string) => `/portal/history/${petId}`,
  portalInvoices: "/portal/invoices",
  portalProfile: "/portal/profile",
  portalNewPet: "/portal/pets/new",
  panel: "/panel",
  panelAgenda: "/panel/agenda",
  panelOwners: "/panel/owners",
  panelOwner: (ownerId: string) => `/panel/owners/${ownerId}`,
  panelPatients: "/panel/patients",
  panelAttention: "/panel/attention",
  panelAppointmentAttention: (appointmentId: string) => `/panel/attention/${appointmentId}`,
  panelInvoices: "/panel/invoices",
  panelUsers: "/panel/users",
  panelStaff: "/panel/staff",
  // El texto de la Ley 1581 va en el pie de la portada.
  dataPolicy: "/#tratamiento-de-datos",
} as const;

export const PROTECTED_ROUTE_PREFIXES = [ROUTES.portal, ROUTES.panel] as const;

export const REFRESH_COOKIE_NAME = "refresh_token";

export const API_REFRESH_PATH = "/auth/refresh";

// Los mismos límites que la API y las columnas de la BD (context/07).
export const FIELD_LIMITS = {
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
  WEIGHT_KG_MAX: 999.9,
  SPECIALTY_MAX: 60,
  APPOINTMENT_REASON_MAX: 200,
} as const;

// Los mismos límites de agenda que la API (RN-21, RN-22).
export const MIN_APPOINTMENT_LEAD_HOURS = 2;
export const MAX_APPOINTMENT_ADVANCE_DAYS = 30;
// RN-24: citas programadas o confirmadas a futuro por mascota.
export const MAX_ACTIVE_APPOINTMENTS_PER_PATIENT = 3;
// D-26: las franjas y los horarios son hora de Colombia.
export const CLINIC_TIME_ZONE = "America/Bogota";

export const OTP_LENGTH = 6;
export const OTP_RESEND_SECONDS = 60;
