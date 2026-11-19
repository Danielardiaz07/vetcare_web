import { PAYMENT_METHOD_LABELS } from "@/features/invoices/labels";
import {
  BOOKABLE_SERVICES,
  CLINIC,
  directionsUrl,
  emergencyPhoneUrl,
  HOURS_SUMMARY,
  LANDING_SERVICES,
  phoneUrl,
  whatsappUrl,
} from "@/features/landing/content";
import { ROUTES } from "@/lib/constants";
import { ownerChatReply } from "@/services/chat-owner";
import type { SessionUser } from "@/types/auth";

export type ChatLink = { label: string; href: string; external?: boolean };
export type FaqTopic = "hours" | "services" | "location" | "booking" | "payments" | "contact";
export type OwnerChatTopic = "appointments" | "alerts" | "vaccines" | "weight";
export type ChatTopic = FaqTopic | OwnerChatTopic;
export type ChatChoice = {
  label: string;
  topic: ChatTopic;
  patientId?: string;
  allPatients?: boolean;
  question?: string;
};
export type ChatPatient = { id: string; name: string };
export type ChatConsultation = {
  topic: ChatTopic;
  answered: boolean;
  patient?: ChatPatient;
  patients?: ChatPatient[];
  allPatients?: boolean;
};

export type ChatReply = {
  text: string;
  links?: ChatLink[];
  items?: { title: string; detail: string; href?: string }[];
  choices?: ChatChoice[];
  bookingAction?: boolean;
  consultation?: ChatConsultation;
};

type ChatContext = {
  user?: Pick<SessionUser, "id" | "role"> | null;
  topic?: ChatTopic;
  patientId?: string;
  allPatients?: boolean;
};

const listOf = (items: string[]) =>
  items.length > 1 ? `${items.slice(0, -1).join(", ")} y ${items.at(-1)}` : (items[0] ?? "");

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
    text: `Atendemos de ${HOURS_SUMMARY}. Para urgencias, llama ${CLINIC.emergencyHours} al ${CLINIC.emergencyPhone}.`,
  },
  services: {
    text: `Estos son los servicios y precios orientativos publicados por VetCare. El valor final depende de la atención. En línea puedes agendar ${listOf(BOOKABLE_SERVICES.map(serviceLabel))}; cirugías y exámenes se coordinan con la clínica.`,
    items: LANDING_SERVICES.map((service) => ({ title: service.name, detail: service.price })),
    bookingAction: true,
  },
  location: {
    text: `Estamos en ${CLINIC.address}, ${CLINIC.neighborhood}, ${CLINIC.city}. Referencia: ${CLINIC.landmark}.`,
    links: [{ label: "Cómo llegar", href: directionsUrl, external: true }],
  },
  booking: {
    text: "Puedes agendar consulta general, vacunación, control o estética. Elige mascota, tipo de cita, profesional y fecha con hora. Para confirmar necesitas iniciar sesión como propietario.",
    bookingAction: true,
  },
  payments: {
    text: `Recibimos ${listOf(Object.values(PAYMENT_METHOD_LABELS).map((label) => label.toLowerCase()))}.`,
  },
  contact: {
    text: `Puedes llamar al ${CLINIC.phone} o escribirnos por WhatsApp para resolver tus dudas con la clínica.`,
    links: CONTACT_LINKS,
  },
};

const OWNER_TOPICS: OwnerChatTopic[] = ["appointments", "alerts", "vaccines", "weight"];

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function hasWord(text: string, keywords: string[]) {
  const words = text.split(" ");
  return keywords.some((keyword) => words.some((word) => word.startsWith(keyword)));
}

function topicOf(question: string, owner: boolean): ChatTopic | null {
  if (hasWord(question, ["cancel", "reprogram"])) return "appointments";
  if (hasWord(question, ["agendar", "reservar", "programar", "pedir"])) return "booking";
  if (
    hasWord(question, ["horario", "abren", "cierran", "abierto", "atienden"]) &&
    !hasWord(question, ["cita", "turno"])
  )
    return "hours";
  if (hasWord(question, ["precio", "cuesta", "valor", "tarifa", "costo"])) return "services";
  if (hasWord(question, ["peso", "pesa", "pesando", "engordo", "adelgazo"])) return "weight";
  if (hasWord(question, ["cuanto"])) return "services";
  if (hasWord(question, ["aviso", "notific", "recordatori", "alerta"])) return "alerts";
  if (hasWord(question, ["carne", "carnet"])) return "vaccines";
  if (hasWord(question, ["vacun"])) {
    return owner || hasWord(question, ["mi", "proxima", "toca", "vence", "vencida", "aplicada"])
      ? "vaccines"
      : "services";
  }
  if (hasWord(question, ["cita", "turno"])) {
    return owner || hasWord(question, ["mi", "proxima", "cuando", "tengo", "tiene", "ver"])
      ? "appointments"
      : "booking";
  }
  if (
    hasWord(question, [
      "horario",
      "hora",
      "abren",
      "cierran",
      "abierto",
      "atienden",
      "sabado",
      "domingo",
    ])
  )
    return "hours";
  if (
    hasWord(question, ["donde", "direccion", "ubicacion", "ubicados", "llegar", "mapa", "barrio"])
  )
    return "location";
  if (
    hasWord(question, [
      "servicio",
      "consulta",
      "estetica",
      "bano",
      "motilada",
      "cirugia",
      "laboratorio",
      "examen",
    ])
  )
    return "services";
  if (hasWord(question, ["contact", "telefono", "whatsapp", "numero", "comunicar", "llamar"]))
    return "contact";
  return null;
}

export function faqReply(topic: FaqTopic): ChatReply {
  return { ...FAQ_REPLIES[topic], consultation: { topic, answered: true } };
}

export async function askVetBot(question: string, context: ChatContext = {}): Promise<ChatReply> {
  const normalized = normalize(question);
  if (hasWord(normalized, ["urgencia", "emergencia", "grave", "sangra", "envenen"])) {
    return {
      text: `Si es una urgencia no esperes una cita: llama ya al ${CLINIC.emergencyPhone}.`,
      links: [{ label: "Llamar a urgencias", href: emergencyPhoneUrl }],
    };
  }
  if (
    !context.topic &&
    (hasWord(normalized, ["pago", "pagar", "efectivo", "transferencia"]) ||
      (hasWord(normalized, ["tarjeta"]) && !hasWord(normalized, ["vacun", "carne"])))
  ) {
    return faqReply("payments");
  }
  const topic = context.topic ?? topicOf(normalized, context.user?.role === "OWNER");
  if (topic && OWNER_TOPICS.includes(topic as OwnerChatTopic)) {
    if (!context.user) {
      return {
        text: "Para consultar tus citas, avisos, vacunas o pesos registrados, inicia sesión como propietario. Solo puedo mostrarte los datos de tus mascotas.",
        links: [
          {
            label: "Iniciar sesión",
            href: `${ROUTES.login}?next=${encodeURIComponent(ROUTES.home)}`,
          },
        ],
      };
    }
    if (context.user.role !== "OWNER") {
      return {
        text: "Estas consultas son del portal del propietario. Con tu cuenta del personal puedes revisar las funciones de tu rol en el panel.",
        links: [{ label: "Ir a mi panel", href: ROUTES.panel }],
      };
    }
    const reply = await ownerChatReply(
      topic as OwnerChatTopic,
      normalized,
      context.patientId,
      context.allPatients,
    );
    return { ...reply, consultation: reply.consultation ?? { topic, answered: true } };
  }
  if (topic) return faqReply(topic as FaqTopic);
  if (hasWord(normalized, ["hola", "buenas", "buenos"])) {
    return {
      text:
        context.user?.role === "OWNER"
          ? "¡Hola! Puedo consultar tus próximas citas, avisos, vacunas y evolución del peso. También puedes preguntarme por horarios, servicios y precios."
          : "¡Hola! Pregúntame por horarios, servicios, precios, ubicación o cómo agendar una cita.",
    };
  }
  return {
    text: "Puedo ayudarte con horarios, servicios, precios y agendamiento; con una cuenta de propietario, también con citas, avisos, vacunas y pesos registrados. Para otras dudas, comunícate con la clínica. No reemplazo la consulta con el veterinario.",
    links: CONTACT_LINKS,
  };
}
