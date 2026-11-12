import type { IconName } from "@/components/ui/icon";
import type { AppointmentType } from "@/types/domain";

// Datos de demostración para presentar la propuesta (D-41): no son de una clínica real. El horario
// coincide con el de los profesionales de seed-demo para que la agenda no contradiga a la landing.
export const CLINIC = {
  emergencyPhone: "315 482 7391",
  whatsappPhone: "300 418 2765",
  phone: "(605) 580 4127",
  email: "vetcare.veterinaria01@gmail.com",
  address: "Carrera 12 # 15-24",
  neighborhood: "Centro",
  city: "Valledupar",
  region: "Cesar",
  landmark: "A media cuadra de la Gobernación del Cesar.",
  weekdayHours: "de 8:00 a. m. a 12:00 m. y de 2:00 p. m. a 6:00 p. m.",
  saturdayHours: "de 8:00 a. m. a 12:00 m. y de 2:00 p. m. a 6:00 p. m.",
  emergencyHours: "las 24 horas, todos los días",
  busDirections:
    "toma una buseta que vaya al Centro por la Calle 16 y bájate frente a la Gobernación del Cesar; la clínica queda a 50 metros.",
  carDirections:
    "llega por la Calle 16 hasta la Gobernación del Cesar y gira por la Carrera 12; la clínica está a media cuadra. Tenemos parqueadero para carros y motos.",
} as const;

const COLOMBIA_CALLING_CODE = "57";

const internationalDigits = (phone: string) =>
  `${COLOMBIA_CALLING_CODE}${phone.replace(/\D/g, "")}`;

const telUrl = (phone: string) => `tel:+${internationalDigits(phone)}`;

const mapsQuery = encodeURIComponent(
  `${CLINIC.address}, ${CLINIC.city}, ${CLINIC.region}, Colombia`,
);

export const whatsappUrl = `https://wa.me/${internationalDigits(CLINIC.whatsappPhone)}`;
export const phoneUrl = telUrl(CLINIC.phone);
export const emergencyPhoneUrl = telUrl(CLINIC.emergencyPhone);
export const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
export const mapEmbedUrl = `https://www.google.com/maps?q=${mapsQuery}&output=embed`;

export const sectionHref = (id: string) => `/#${id}`;

export const BOOKING_SECTION_ID = "agendar";

type NavItem = { label: string; href: string; sectionId?: string };

export const LANDING_NAV: NavItem[] = [
  { label: "Inicio", href: sectionHref("inicio"), sectionId: "inicio" },
  { label: "Servicios", href: sectionHref("servicios"), sectionId: "servicios" },
  { label: "Agendar", href: sectionHref(BOOKING_SECTION_ID), sectionId: BOOKING_SECTION_ID },
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
    price: "Desde $45.000",
  },
  {
    name: "Vacunación",
    shortName: "Vacunación",
    description:
      "Plan de vacunas según edad y especie, con aviso de la próxima dosis en tu portal.",
    icon: "syringe",
    appointmentType: "VACCINATION",
    durationMinutes: 30,
    price: "Desde $40.000",
  },
  {
    name: "Control",
    shortName: "Control",
    description: "Seguimiento después de una consulta para revisar cómo va el tratamiento.",
    icon: "clipboard-check",
    appointmentType: "CHECKUP",
    durationMinutes: 30,
    price: "Desde $30.000",
  },
  {
    name: "Estética: baño y motilada",
    shortName: "Baño y motilada",
    description: "Baño, corte, uñas y limpieza de oídos con nuestro equipo de estética.",
    icon: "scissors",
    appointmentType: "GROOMING",
    durationMinutes: 90,
    price: "Desde $45.000, según tamaño",
  },
  {
    name: "Cirugía",
    shortName: "Cirugía",
    description: "Valoración prequirúrgica, esterilizaciones y procedimientos programados.",
    icon: "scalpel",
    price: "Valoración desde $50.000",
  },
  {
    name: "Laboratorio",
    shortName: "Laboratorio",
    description:
      "Hemograma, química sanguínea, coproscópico y más, con los resultados en tu historial.",
    icon: "flask",
    price: "Desde $40.000",
  },
];

export const BOOKABLE_SERVICES = LANDING_SERVICES.filter((service) => service.appointmentType);

export type TeamMember = {
  name: string;
  specialty: string;
  // Ruta dentro de front/public; sin foto se muestran las iniciales.
  photo: string | null;
};

// Mismos veterinarios que los datos de prueba del frontend (services/mocks/fixtures.ts).
export const LANDING_TEAM: TeamMember[] = [
  { name: "Dra. Natalia Quintero Ramos", specialty: "Medicina general", photo: null },
  { name: "Dr. Andrés Mejía Torres", specialty: "Cirugía", photo: null },
  { name: "Dra. Mariana Arzuaga Pinto", specialty: "Dermatología veterinaria", photo: null },
];
