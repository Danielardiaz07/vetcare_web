"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-provider";
import {
  answerCount,
  choiceKey,
  INITIAL_CHAT_PROGRESS,
  recordConsultation,
  type ChatProgress,
} from "@/features/chat/suggestions";
import type { ChatReply, ChatTopic } from "@/services/chat";
import { ApiError } from "@/services/http-client";

type Message = {
  id: number;
  from: "user" | "bot";
  reply: ChatReply;
  choiceCounts?: Record<string, number>;
};

export type ChatQuestion = {
  text: string;
  label?: string;
  topic?: ChatTopic;
  patientId?: string;
  allPatients?: boolean;
};

type Conversation = {
  session: { key: string };
  messages: Message[];
  progress: ChatProgress;
  busy: boolean;
  failed: { question: ChatQuestion; expired: boolean } | null;
};

type ChatContextValue = Pick<Conversation, "messages" | "progress" | "busy" | "failed"> & {
  submitQuestion: (question: ChatQuestion, retry?: boolean) => Promise<boolean>;
};

const GREETING: Message = {
  id: 0,
  from: "bot",
  reply: { text: "Hola, soy VetBot, el asistente de VetCare. ¿En qué te ayudo hoy?" },
};

const ChatContext = createContext<ChatContextValue | null>(null);

function startConversation(key: string): Conversation {
  return {
    session: { key },
    messages: [GREETING],
    progress: INITIAL_CHAT_PROGRESS,
    busy: false,
    failed: null,
  };
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const sessionKey = user ? `${user.id}:${user.role}` : status;
  const [conversation, setConversation] = useState(() => startConversation(sessionKey));
  const inFlight = useRef<Conversation["session"] | null>(null);
  const { session, messages, progress, busy, failed } = conversation;

  if (session.key !== sessionKey) {
    setConversation(startConversation(sessionKey));
  }

  async function submitQuestion(question: ChatQuestion, retry = false): Promise<boolean> {
    if (inFlight.current === session) return false;
    inFlight.current = session;
    setConversation((current) => {
      if (current.session !== session) return current;
      const message: Message = {
        id: current.messages.length,
        from: "user",
        reply: { text: question.label ?? question.text },
      };
      return {
        ...current,
        busy: true,
        failed: null,
        messages: retry ? current.messages : [...current.messages, message],
      };
    });

    try {
      const { askVetBot } = await import("@/services/chat");
      const reply = await askVetBot(question.text, {
        user,
        topic: question.topic,
        patientId: question.patientId,
        allPatients: question.allPatients,
      });
      setConversation((current) => {
        if (current.session !== session) return current;
        const nextProgress = recordConsultation(current.progress, reply.consultation);
        const pendingChoices = reply.choices?.filter(
          (choice) => answerCount(nextProgress, choice) === 0,
        );
        const choices = pendingChoices?.length ? pendingChoices : reply.choices;
        const choiceCounts =
          choices &&
          Object.fromEntries(
            choices.map((choice) => [choiceKey(choice), answerCount(nextProgress, choice)]),
          );
        const response: Message = {
          id: current.messages.length,
          from: "bot",
          reply: { ...reply, choices },
          choiceCounts,
        };
        return {
          ...current,
          progress: nextProgress,
          busy: false,
          messages: [...current.messages, response],
        };
      });
      return true;
    } catch (error) {
      const failure = { question, expired: error instanceof ApiError && error.status === 401 };
      setConversation((current) =>
        current.session === session ? { ...current, busy: false, failed: failure } : current,
      );
      return false;
    } finally {
      if (inFlight.current === session) inFlight.current = null;
    }
  }

  return (
    <ChatContext.Provider value={{ messages, progress, busy, failed, submitQuestion }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextValue {
  const chat = useContext(ChatContext);
  if (!chat) throw new Error("useChat debe usarse dentro de ChatProvider");
  return chat;
}
