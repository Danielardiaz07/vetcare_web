import type { ChatChoice, ChatConsultation, ChatPatient, ChatTopic } from "@/services/chat";

export type ChatProgress = {
  answers: Record<string, number>;
  started: ChatTopic[];
  patients: ChatPatient[] | null;
  lastTopic: ChatTopic | null;
};

export const INITIAL_CHAT_PROGRESS: ChatProgress = {
  answers: {},
  started: [],
  patients: null,
  lastTopic: null,
};

const GENERAL_OPTIONS: ChatChoice[] = [
  { topic: "hours", label: "Horarios" },
  { topic: "services", label: "Servicios y precios" },
  { topic: "location", label: "Ubicación" },
  { topic: "booking", label: "Agendar cita" },
  { topic: "payments", label: "Medios de pago" },
  { topic: "contact", label: "Contacto" },
];
const OWNER_OPTIONS: ChatChoice[] = [
  { topic: "appointments", label: "Mis citas" },
  { topic: "alerts", label: "Mis avisos" },
  { topic: "vaccines", label: "Vacunas" },
  { topic: "weight", label: "Evolución del peso" },
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
  return {
    started: progress.started.includes(consultation.topic)
      ? progress.started
      : [...progress.started, consultation.topic],
    answers,
    patients,
    lastTopic: consultation.topic,
  };
}

export function consultationComplete(
  progress: ChatProgress,
  choice: Pick<ChatChoice, "topic" | "patientId">,
): boolean {
  if (
    (choice.topic === "weight" || choice.topic === "vaccines" || choice.topic === "appointments") &&
    !choice.patientId
  ) {
    if (progress.patients === null) return false;
    return progress.patients.length === 0
      ? answerCount(progress, choice) > 0
      : progress.patients.every(
          ({ id }) => answerCount(progress, { topic: choice.topic, patientId: id }) > 0,
        );
  }
  return answerCount(progress, choice) > 0;
}

export function chatSuggestions(
  progress: ChatProgress,
  owner: boolean,
  previous?: ChatChoice[],
): ChatChoice[] {
  const options = chatOptions(owner);
  const current = (previous ?? (owner ? OWNER_OPTIONS : GENERAL_OPTIONS.slice(0, 4)))
    .map(({ topic }) => options.find((option) => option.topic === topic))
    .filter((option): option is ChatChoice => option !== undefined);
  if (!progress.lastTopic) return current;
  const candidates: ChatChoice[] = [];
  const add = (topic: ChatTopic) => {
    const option = options.find((item) => item.topic === topic);
    if (!option) return;
    candidates.push(option);
  };
  for (const topic of ["weight", "vaccines", "appointments"] as const) {
    if (progress.started.includes(topic) && !consultationComplete(progress, { topic })) add(topic);
  }
  if (progress.lastTopic === "weight" || progress.lastTopic === "vaccines") {
    add(progress.lastTopic);
    add(progress.lastTopic === "weight" ? "vaccines" : "weight");
    add("appointments");
    add("booking");
  } else if (progress.lastTopic === "services") {
    add("booking");
    add("payments");
    add("hours");
  } else if (progress.lastTopic === "hours") {
    add("location");
    add("contact");
    add("services");
  } else if (progress.lastTopic === "appointments") {
    add("alerts");
    add("vaccines");
    add("booking");
  } else if (progress.lastTopic === "alerts") {
    add("appointments");
    add("vaccines");
    add("weight");
    add("booking");
  } else if (progress.lastTopic === "location") {
    add("hours");
    add("contact");
    add("booking");
  } else if (progress.lastTopic === "booking") {
    add("hours");
    add("services");
    add("location");
    add("payments");
  } else if (progress.lastTopic === "payments") {
    add("services");
    add("booking");
    add("contact");
  } else if (progress.lastTopic === "contact") {
    add("location");
    add("hours");
    add("booking");
    add("payments");
  }
  candidates.push(...options);
  const seen = new Set(
    current.filter((choice) => !consultationComplete(progress, choice)).map(({ topic }) => topic),
  );
  const replacement = () => {
    const choice = candidates.find(
      (candidate) => !seen.has(candidate.topic) && !consultationComplete(progress, candidate),
    );
    if (choice) seen.add(choice.topic);
    return choice;
  };
  const suggestions = current
    .map((choice) => (consultationComplete(progress, choice) ? replacement() : choice))
    .filter((choice): choice is ChatChoice => choice !== undefined);
  while (suggestions.length < 4) {
    const choice = replacement();
    if (!choice) break;
    suggestions.push(choice);
  }
  return suggestions;
}
