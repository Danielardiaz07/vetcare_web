import { PAYMENT_METHOD_LABELS } from "@/features/invoices/labels";
import {
  BOOKABLE_SERVICES,
  CLINIC,
  directionsUrl,
  LANDING_SERVICES,
  phoneUrl,
  whatsappUrl,
} from "@/features/landing/content";

// P-08: mientras la API no tenga un endpoint de chat, VetBot responde solo preguntas frecuentes.
export type ChatLink = { label: string; href: string; external?: boolean };

export type ChatReply = {
  text: string;
  links?: ChatLink[];
  // "Agendar cita" lleva a la sección de agendar de la portada.
  bookingAction?: boolean;
};

export type FaqTopic = "hours" | "services" | "location" | "booking";

const listOf = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} y ${items.at(-1)}` : (items[0] ?? "");

// "Estética: baño y motilada" se lee mejor dentro de una lista como "estética (baño y motilada)".
const serviceLabel = ({ name }: { name: string }) => {
  const [main, detail] = name.toLowerCase().split(": ");
  return detail ? `${main} (${detail})` : (main ?? "");
};

const CONTACT_LINKS: ChatLink[] = [
  { label: "Escribir por WhatsApp", href: whatsappUrl, external: true },
  { label: "Llamar", href: phoneUrl },
];

const FAQ_REPLIES: Record<FaqTopic, ChatReply> = {
  hours: {
    text: `Atendemos de lunes a viernes ${CLINIC.weekdayHours} y los sábados ${CLINIC.saturdayHours}. Para urgencias: ${CLINIC.emergencyHours}, al ${CLINIC.emergencyPhone}.`,
  },
  services: {
    text: `Ofrecemos ${listOf(LANDING_SERVICES.map(serviceLabel))}. En línea puedes agendar ${listOf(BOOKABLE_SERVICES.map(serviceLabel))}; lo demás se coordina con la clínica. Los valores están en la sección Servicios.`,
  },
  location: {
    text: `Estamos en ${CLINIC.address}, ${CLINIC.neighborhood}, ${CLINIC.city}. Referencia: ${CLINIC.landmark}.`,
    links: [{ label: "Cómo llegar", href: directionsUrl, external: true }],
  },
  booking: {
    text: "Agendas aquí mismo en 5 pasos: mascota, tipo de cita, profesional, día y hora. Para elegir a tu mascota necesitas iniciar sesión.",
    bookingAction: true,
  },
};

const PAYMENT_REPLY: ChatReply = {
  text: `Recibimos ${listOf(Object.values(PAYMENT_METHOD_LABELS).map((label) => label.toLowerCase()))}.`,
};

const EMERGENCY_REPLY: ChatReply = {
  text: `Si es una urgencia no esperes una cita: llama ya al ${CLINIC.emergencyPhone}.`,
  links: [{ label: "Llamar a urgencias", href: `tel:${CLINIC.emergencyPhone}` }],
};

const GREETING_REPLY: ChatReply = {
  text: "¡Hola! Pregúntame por horarios, servicios, ubicación o cómo agendar una cita.",
};

const FALLBACK_REPLY: ChatReply = {
  text: "Todavía no tengo esa respuesta. Escríbenos o llámanos y te ayudamos. Recuerda que no reemplazo la consulta con el veterinario.",
  links: CONTACT_LINKS,
};

// Del más urgente al más general: "urgencia" gana aunque la pregunta también diga "cita".
const KEYWORD_REPLIES: { keywords: string[]; reply: ChatReply }[] = [
  { keywords: ["urgencia", "emergencia", "grave", "sangra", "envenen"], reply: EMERGENCY_REPLY },
  {
    keywords: ["horario", "hora", "abren", "cierran", "abierto", "atienden", "sabado", "domingo"],
    reply: FAQ_REPLIES.hours,
  },
  {
    keywords: ["donde", "direccion", "ubicacion", "ubicados", "llegar", "mapa", "barrio"],
    reply: FAQ_REPLIES.location,
  },
  { keywords: ["pago", "pagar", "tarjeta", "efectivo", "transferencia"], reply: PAYMENT_REPLY },
  { keywords: ["agendar", "agenda", "cita", "reservar", "turno"], reply: FAQ_REPLIES.booking },
  {
    keywords: [
      "servicio",
      "precio",
      "valor",
      "cuesta",
      "vacuna",
      "consulta",
      "estetica",
      "bano",
      "cirugia",
      "laboratorio",
    ],
    reply: FAQ_REPLIES.services,
  },
  { keywords: ["hola", "buenas", "buenos"], reply: GREETING_REPLY },
];

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

export function faqReply(topic: FaqTopic): ChatReply {
  return FAQ_REPLIES[topic];
}

// Es asíncrona para que cambiarla por un endpoint de la API no toque el chat.
export async function askVetBot(question: string): Promise<ChatReply> {
  // Por palabra y no por texto: así "ahora" no cuenta como "hora".
  const words = normalize(question).split(/[^a-z0-9]+/);
  const match = KEYWORD_REPLIES.find(({ keywords }) =>
    keywords.some((keyword) => words.some((word) => word.startsWith(keyword))),
  );
  return match?.reply ?? FALLBACK_REPLY;
}
