import type { IconName } from "@/components/ui/icon";
import type { ChatChoice, ChatConsultation, ChatPatient } from "@/services/chat";

export type ChatProgress = {
  answers: Record<string, number>;
  patients: ChatPatient[] | null;
};

export const INITIAL_CHAT_PROGRESS: ChatProgress = {
  answers: {},
  patients: null,
};

type ChatOption = Pick<ChatChoice, "topic" | "label"> & { icon: IconName };

const GENERAL_OPTIONS: ChatOption[] = [
  { topic: "hours", label: "Horarios", icon: "clock" },
  { topic: "services", label: "Servicios y precios", icon: "stethoscope" },
  { topic: "location", label: "Ubicación", icon: "map-pin" },
  { topic: "booking", label: "Agendar cita", icon: "calendar-plus" },
  { topic: "payments", label: "Medios de pago", icon: "receipt" },
  { topic: "contact", label: "Contacto", icon: "phone" },
];
const OWNER_OPTIONS: ChatOption[] = [
  { topic: "appointments", label: "Mis citas", icon: "calendar" },
  { topic: "alerts", label: "Mis avisos", icon: "bell" },
  { topic: "vaccines", label: "Vacunas", icon: "syringe" },
  { topic: "weight", label: "Evolución del peso", icon: "chart" },
];

export const chatOptions = (owner: boolean) =>
  owner ? [...OWNER_OPTIONS, ...GENERAL_OPTIONS] : GENERAL_OPTIONS;
export const choiceKey = ({ topic, patientId }: Pick<ChatChoice, "topic" | "patientId">) =>
  `${topic}:${patientId ?? "all"}`;
export const answerCount = (
  progress: ChatProgress,
  choice: Pick<ChatChoice, "topic" | "patientId">,
) => progress.answers[choiceKey(choice)] ?? 0;

export function recordConsultation(
  progress: ChatProgress,
  consultation?: ChatConsultation,
): ChatProgress {
  if (!consultation) return progress;
  const patients = consultation.patients ?? progress.patients;
  const key = choiceKey({
    topic: consultation.topic,
    patientId:
      consultation.topic === "weight" ||
      consultation.topic === "vaccines" ||
      consultation.topic === "appointments"
        ? consultation.patient?.id
        : undefined,
  });
  const answers = { ...progress.answers };
  if (consultation.answered) {
    answers[key] = (answers[key] ?? 0) + 1;
    if (consultation.topic === "appointments" && consultation.allPatients) {
      for (const patient of patients ?? []) {
        const patientKey = choiceKey({ topic: "appointments", patientId: patient.id });
        answers[patientKey] = (answers[patientKey] ?? 0) + 1;
      }
    }
  }
  return { answers, patients };
}
