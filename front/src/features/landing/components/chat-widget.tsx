"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/cn";
import { useAuthDialog } from "@/features/auth/components/auth-dialog";
import { useLandingBooking } from "@/features/landing/booking-context";
import { askVetBot, faqReply, type ChatReply, type FaqTopic } from "@/services/chat";

type Message = { id: number; from: "user" | "bot"; reply: ChatReply };

const GREETING: Message = {
  id: 0,
  from: "bot",
  reply: { text: "Hola, soy VetBot, el asistente de VetCare. ¿En qué te ayudo hoy?" },
};

const QUICK_QUESTIONS: { topic: FaqTopic; label: string }[] = [
  { topic: "hours", label: "Horarios" },
  { topic: "services", label: "Servicios" },
  { topic: "location", label: "Ubicación" },
  { topic: "booking", label: "Agendar cita" },
];

const MESSAGE_MAX_LENGTH = 200;

type ChatWidgetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChatWidget({ open, onOpenChange }: ChatWidgetProps) {
  const { isOpen: authDialogOpen } = useAuthDialog();
  const { requestBooking } = useLandingBooking();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const nextId = useRef(1);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages]);

  // La ventana de sesión queda encima de todo; el chat se aparta mientras está abierta.
  if (authDialogOpen) return null;

  function close() {
    onOpenChange(false);
    toggleRef.current?.focus();
  }

  function add(from: Message["from"], reply: ChatReply) {
    const message = { id: nextId.current++, from, reply };
    setMessages((current) => [...current, message]);
  }

  function askTopic(topic: FaqTopic, label: string) {
    add("user", { text: label });
    add("bot", faqReply(topic));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;
    setDraft("");
    add("user", { text: question });
    add("bot", await askVetBot(question));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  }

  function goToBooking() {
    onOpenChange(false);
    requestBooking();
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-labelledby={titleId}
          onKeyDown={handleKeyDown}
          className="flex max-h-[min(36rem,calc(100dvh-7rem))] w-[min(22.5rem,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-card border border-line bg-surface shadow-xl transition-[opacity,scale] duration-200 ease-out starting:scale-95 starting:opacity-0 motion-reduce:starting:scale-100"
        >
          <div className="flex items-start justify-between gap-3 bg-brand-700 px-4 py-3 text-white">
            <div>
              <h2 id={titleId} className="font-semibold">
                VetBot
              </h2>
              <p className="text-sm text-white/80">
                Asistente virtual de VetCare · no reemplaza la consulta
              </p>
            </div>
            <button
              type="button"
              aria-label="Cerrar chat"
              onClick={close}
              className="flex size-11 flex-none items-center justify-center rounded-control bg-white/15 transition-colors duration-150 ease-out hover:bg-white/25"
            >
              <Icon name="close" width={20} height={20} />
            </button>
          </div>

          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            className="flex flex-1 flex-col gap-3 overflow-y-auto bg-canvas p-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex max-w-[85%] flex-col gap-2",
                  message.from === "user" ? "self-end items-end" : "self-start",
                )}
              >
                <p
                  className={cn(
                    "rounded-control px-4 py-2.5 text-pretty",
                    message.from === "user"
                      ? "rounded-br-sm bg-brand-600 text-white"
                      : "rounded-bl-sm border border-line bg-surface text-ink",
                  )}
                >
                  <span className="sr-only">{message.from === "user" ? "Tú: " : "VetBot: "}</span>
                  {message.reply.text}
                </p>
                {(message.reply.links || message.reply.bookingAction) && (
                  <div className="flex flex-wrap gap-2">
                    {message.reply.bookingAction && (
                      <button
                        type="button"
                        onClick={goToBooking}
                        className="inline-flex min-h-9 items-center rounded-chip bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700"
                      >
                        Ir a agendar
                      </button>
                    )}
                    {message.reply.links?.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
                        className="inline-flex min-h-9 items-center rounded-chip border border-line bg-surface px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 border-t border-line p-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Preguntas frecuentes">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question.topic}
                  type="button"
                  onClick={() => askTopic(question.topic, question.label)}
                  className="min-h-9 rounded-chip border border-line bg-canvas px-3 text-sm font-medium text-ink transition-colors duration-150 ease-out hover:border-brand-200 hover:bg-brand-50"
                >
                  {question.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <label htmlFor={`${panelId}-message`} className="sr-only">
                Escribe tu pregunta
              </label>
              <input
                ref={inputRef}
                id={`${panelId}-message`}
                type="text"
                value={draft}
                maxLength={MESSAGE_MAX_LENGTH}
                autoComplete="off"
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Escribe tu pregunta…"
                className="min-h-11 min-w-0 flex-1 rounded-control border border-field-border bg-surface px-4 text-ink"
              />
              <button
                type="submit"
                aria-label="Enviar pregunta"
                className="flex size-11 flex-none items-center justify-center rounded-control bg-brand-600 text-white transition-colors duration-150 ease-out hover:bg-brand-700"
              >
                <Icon name="arrow-right" width={20} height={20} />
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente virtual"}
        onClick={() => onOpenChange(!open)}
        className="inline-flex min-h-14 min-w-14 items-center justify-center gap-2 rounded-control bg-brand-600 px-4 font-semibold text-white shadow-lg transition-colors duration-150 ease-out hover:bg-brand-700"
      >
        <Icon name={open ? "close" : "message"} width={22} height={22} />
        <span className="hidden sm:inline">Asistente</span>
      </button>
    </div>
  );
}
