import type { IconName } from "@/components/ui/icon";
import { ROUTES } from "@/lib/constants";
import type { AppointmentType } from "@/types/domain";

// Los datos de la clínica que aún no tenemos van entre corchetes para reemplazarlos.
export const CLINIC = {
  emergencyPhone: "[TELÉFONO]",
  whatsappNumber: "[NÚMERO]",
  phone: "[TELÉFONO / WHATSAPP]",
  email: "[CORREO DE CONTACTO]",
  address: "[DIRECCIÓN]",
  neighborhood: "[BARRIO]",
  city: "[CIUDAD]",
  landmark: "[PUNTO DE REFERENCIA]",
  weekdayHours: "[HORARIO]",
  saturdayHours: "[HORARIO]",
  emergencyHours: "[HORARIO DE URGENCIAS]",
  busDirections: "rutas [RUTAS]. Bájate en [PARADERO], a [X] metros de la clínica.",
  carDirections: "[INDICACIONES DESDE UNA VÍA PRINCIPAL]. Parqueadero: [SÍ / NO].",
  dataPolicyUrl: "[ENLACE A LA POLÍTICA DE TRATAMIENTO DE DATOS]",
  // Pega aquí la URL "Insertar mapa" de Google Maps cuando se tenga la dirección.
  mapEmbedUrl: null as string | null,
} as const;

export const whatsappUrl = `https://wa.me/${CLINIC.whatsappNumber}`;
export const phoneUrl = `tel:${CLINIC.phone}`;
export const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${CLINIC.address}, ${CLINIC.neighborhood}, ${CLINIC.city}`,
)}`;

export const sectionHref = (id: string) => `/#${id}`;

export const bookingHref = (type?: AppointmentType) =>
  type ? `${ROUTES.portalNewAppointment}?type=${type}` : ROUTES.portalNewAppointment;

type NavItem = { label: string; href: string; sectionId?: string };

export const LANDING_NAV: NavItem[] = [
  { label: "Inicio", href: sectionHref("inicio"), sectionId: "inicio" },
  { label: "Servicios", href: sectionHref("servicios"), sectionId: "servicios" },
  { label: "Agendar", href: bookingHref() },
  { label: "Equipo", href: sectionHref("equipo"), sectionId: "equipo" },
  { label: "Ubicación", href: sectionHref("ubicacion"), sectionId: "ubicacion" },
];

export type LandingService = {
  name: string;
  shortName: string;
  description: string;
  icon: IconName;
  // Solo los tipos de cita del sistema se agendan en línea; el resto se coordina con la clínica.
  appointmentType?: AppointmentType;
  durationMinutes?: number;
  price: string;
};

// RN-19: duraciones iniciales de cada tipo de cita.
export const LANDING_SERVICES: LandingService[] = [
  {
    name: "Consulta general",
    shortName: "Consulta",
    description: "Controles de rutina y atención cuando tu mascota está enferma.",
    icon: "stethoscope",
    appointmentType: "GENERAL_CONSULTATION",
    durationMinutes: 30,
    price: "Desde [VALOR]",
  },
  {
    name: "Vacunación",
    shortName: "Vacunación",
    description:
      "Plan de vacunas según edad y especie, con aviso de la próxima dosis en tu portal.",
    icon: "syringe",
    appointmentType: "VACCINATION",
    durationMinutes: 30,
    price: "Desde [VALOR]",
  },
  {
    name: "Control",
    shortName: "Control",
    description: "Seguimiento después de una consulta para revisar cómo va el tratamiento.",
    icon: "clipboard-check",
    appointmentType: "CHECKUP",
    durationMinutes: 30,
    price: "Desde [VALOR]",
  },
  {
    name: "Estética: baño y motilada",
    shortName: "Baño y motilada",
    description: "Baño, corte, uñas y limpieza de oídos con nuestro equipo de estética.",
    icon: "scissors",
    appointmentType: "GROOMING",
    durationMinutes: 90,
    price: "Desde [VALOR], según tamaño",
  },
  {
    name: "Cirugía",
    shortName: "Cirugía",
    description: "Valoración prequirúrgica, esterilizaciones y procedimientos programados.",
    icon: "scalpel",
    price: "Valoración desde [VALOR]",
  },
  {
    name: "Laboratorio",
    shortName: "Laboratorio",
    description:
      "Hemograma, química sanguínea, coproscópico y más, con los resultados en tu historial.",
    icon: "flask",
    price: "Desde [VALOR]",
  },
];

export const BOOKABLE_SERVICES = LANDING_SERVICES.filter((service) => service.appointmentType);

export const TEAM_PLACEHOLDERS = 3;
