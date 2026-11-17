"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/cn";
import { useAuth } from "@/features/auth/auth-provider";
import { useAuthDialog } from "@/features/auth/components/auth-dialog";
import {
  answerCount,
  chatOptions,
  chatSuggestions,
  choiceKey,
  INITIAL_CHAT_PROGRESS,
  recordConsultation,
  type ChatProgress,
} from "@/features/chat/suggestions";
import { ROUTES } from "@/lib/constants";
import { askVetBot, type ChatReply, type ChatTopic } from "@/services/chat";
import { ApiError } from "@/services/http-client";
import type { SessionUser } from "@/types/auth";

type Message = {
  id: number;
  from: "user" | "bot";
  reply: ChatReply;
  choiceCounts?: Record<string, number>;
};

const GREETING: Message = {
  id: 0,
  from: "bot",
  reply: { text: "Hola, soy VetBot, el asistente de VetCare. ¿En qué te ayudo hoy?" },
};

const MESSAGE_MAX_LENGTH = 200;
type Question = {
  text: string;
  label?: string;
  topic?: ChatTopic;
  patientId?: string;
  allPatients?: boolean;
};

type ChatWidgetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooking: () => void;
};

export function ChatWidget(props: ChatWidgetProps) {
  const { user, status } = useAuth();
  if (status === "loading") return null;
  return (
    <ChatConversation
      key={`${user?.id ?? "anonymous"}:${user?.role ?? "public"}`}
      user={user}
      {...props}
    />
  );
}

function ChatConversation({
  open,
  onOpenChange,
  onBooking,
  user,
}: ChatWidgetProps & { user: SessionUser | null }) {
  const { isOpen: authDialogOpen } = useAuthDialog();
  const [messages, setMessages] = useState<Message[]>([
    user?.role === "OWNER"
      ? {
          ...GREETING,
          reply: {
            text: "Hola, soy VetBot. Puedo consultar tus próximas citas, avisos, vacunas y evolución del peso, y orientarte sobre horarios, servicios y precios. ¿Qué necesitas?",
          },
        }
      : GREETING,
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ChatProgress>(INITIAL_CHAT_PROGRESS);
  const [suggestions, setSuggestions] = useState(() =>
    chatSuggestions(INITIAL_CHAT_PROGRESS, user?.role === "OWNER"),
  );
  const [allOptionsOpen, setAllOptionsOpen] = useState(false);
  const [failed, setFailed] = useState<{ question: Question; expired: boolean } | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const nextId = useRef(1);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();
  const allOptions = chatOptions(user?.role === "OWNER");
  const quickQuestions = suggestions
    .map(({ topic }) => allOptions.find((option) => option.topic === topic))
    .filter((option) => option !== undefined);
  const visibleOptions = allOptionsOpen ? allOptions : quickQuestions;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!open || authDialogOpen) return;
    const frame = requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open, authDialogOpen]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, open, busy, failed]);

  if (authDialogOpen) return null;

  function close() {
    onOpenChange(false);
    requestAnimationFrame(() => toggleRef.current?.focus({ preventScroll: true }));
  }

  function add(from: Message["from"], reply: ChatReply, choiceCounts?: Record<string, number>) {
    const message = { id: nextId.current++, from, reply, choiceCounts };
    setMessages((current) => [...current, message]);
  }

  async function send(question: Question, retry = false) {
    if (inFlight.current) return;
    const focused = document.activeElement;
    inFlight.current = true;
    setBusy(true);
    setFailed(null);
    if (!retry) add("user", { text: question.label ?? question.text });
    try {
      const reply = await askVetBot(question.text, {
        user,
        topic: question.topic,
        patientId: question.patientId,
        allPatients: question.allPatients,
      });
      if (mounted.current) {
        const nextProgress = recordConsultation(progress, reply.consultation);
        const pendingChoices = reply.choices?.filter(
          (choice) => answerCount(nextProgress, choice) === 0,
        );
        const choices = pendingChoices?.length ? pendingChoices : reply.choices;
        const choiceCounts =
          choices &&
          Object.fromEntries(
            choices.map((choice) => [choiceKey(choice), answerCount(nextProgress, choice)]),
          );
        setProgress(nextProgress);
        setSuggestions((current) => chatSuggestions(nextProgress, user?.role === "OWNER", current));
        setAllOptionsOpen(false);
        add("bot", { ...reply, choices }, choiceCounts);
        requestAnimationFrame(() => {
          if (
            focused &&
            !focused.isConnected &&
            document.activeElement === document.body &&
            panelRef.current?.getAttribute("aria-hidden") === "false"
          ) {
            panelRef.current.focus({ preventScroll: true });
          }
        });
      }
    } catch (error) {
      if (mounted.current)
        setFailed({ question, expired: error instanceof ApiError && error.status === 401 });
    } finally {
      if (mounted.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || inFlight.current) return;
    setDraft("");
    void send({ text: question });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  }

  function goToBooking() {
    onOpenChange(false);
    onBooking();
  }

  return (
    <>
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-labelledby={titleId}
        aria-hidden={!open}
        inert={!open}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onTransitionEnd={(event) => {
          if (
            open &&
            event.target === event.currentTarget &&
            event.propertyName === "opacity" &&
            !event.currentTarget.contains(document.activeElement)
          ) {
            panelRef.current?.focus({ preventScroll: true });
          }
        }}
        className={cn(
          "fixed right-0 bottom-4 z-40 flex h-[min(35rem,calc(100dvh-2rem))] w-[min(25rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-l-card border border-r-0 border-line bg-surface shadow-xl outline-none transition-[opacity,translate,visibility] duration-200 ease-out motion-reduce:translate-x-0 motion-reduce:transition-none sm:bottom-6 sm:h-[min(35rem,calc(100dvh-3rem))]",
          open
            ? "visible translate-x-0 opacity-100"
            : "pointer-events-none invisible translate-x-2 opacity-0",
        )}
      >
        <div className="flex shrink-0 items-center gap-2 bg-brand-700 px-3 py-2 text-white">
          <Icon name="bot" className="size-7 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-semibold leading-5">
              VetBot
            </h2>
            <p className="mt-0.5 text-xs leading-tight text-white/80">
              Asistente virtual de VetCare · no reemplaza la consulta
            </p>
          </div>
          <button
            type="button"
            aria-label="Minimizar chat"
            title="Minimizar chat"
            onClick={close}
            className="flex size-11 flex-none items-center justify-center rounded-full transition-colors duration-150 ease-out hover:bg-white/15"
          >
            <Icon name="chevron-right" className="rotate-90" width={20} height={20} />
          </button>
        </div>

        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-busy={busy}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain bg-canvas p-3 text-sm leading-relaxed"
        >
          {messages.map((message) => {
            const choices = message.reply.choices?.filter(
              (choice) =>
                (!choice.patientId ||
                  progress.patients === null ||
                  progress.patients.some(({ id }) => id === choice.patientId)) &&
                answerCount(progress, choice) <= (message.choiceCounts?.[choiceKey(choice)] ?? 0),
            );
            return (
              <div
                key={message.id}
                className={cn(
                  "flex min-w-0 max-w-[90%] flex-col gap-2 [overflow-wrap:anywhere]",
                  message.from === "user" ? "self-end items-end" : "self-start",
                )}
              >
                <div
                  className={cn(
                    "rounded-control px-4 py-2.5 text-pretty",
                    message.from === "user"
                      ? "rounded-br-sm bg-brand-600 text-white"
                      : "rounded-bl-sm border border-line bg-surface text-ink",
                  )}
                >
                  <p>
                    <span className="sr-only">{message.from === "user" ? "Tú: " : "VetBot: "}</span>
                    {message.reply.text}
                  </p>
                  {!!message.reply.items?.length && (
                    <ul className="mt-3 flex flex-col divide-y divide-line border-t border-line">
                      {message.reply.items.map((item, index) => (
                        <li key={`${item.title}:${index}`} className="py-2 last:pb-0">
                          {item.href ? (
                            <Link
                              href={item.href}
                              onClick={() => onOpenChange(false)}
                              className="font-semibold text-brand-700 underline decoration-brand-200 underline-offset-2 hover:decoration-brand-700"
                            >
                              {item.title}
                            </Link>
                          ) : (
                            <span className="font-semibold">{item.title}</span>
                          )}
                          <p className="mt-0.5 text-muted">{item.detail}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {(message.reply.links || message.reply.bookingAction || !!choices?.length) && (
                  <div className="flex flex-wrap gap-2">
                    {choices?.map((choice) => (
                      <button
                        key={choice.patientId ?? choice.label}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void send({
                            text: choice.question ?? choice.label,
                            label: choice.label,
                            topic: choice.topic,
                            patientId: choice.patientId,
                            allPatients: choice.allPatients,
                          })
                        }
                        className="min-h-8 rounded-control border border-brand-200 bg-brand-50 px-2.5 py-1 text-left text-sm font-medium text-brand-700 hover:bg-brand-100 pointer-coarse:min-h-11 disabled:cursor-wait disabled:opacity-60"
                      >
                        {choice.label}
                      </button>
                    ))}
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
                      <Link
                        key={link.label}
                        href={link.href}
                        onClick={() => {
                          if (link.href.startsWith("/")) onOpenChange(false);
                        }}
                        {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
                        className="inline-flex min-h-9 items-center rounded-chip border border-line bg-surface px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {busy && (
            <p role="status" className="text-xs text-muted">
              Consultando…
            </p>
          )}
          {failed && (
            <div
              role="alert"
              className="rounded-control border border-warning-border bg-warning-bg p-3 text-sm text-ink"
            >
              <p>
                {failed.expired
                  ? "Tu sesión venció. Inicia sesión de nuevo para consultar tus datos."
                  : "No pude consultar tus datos. Intenta de nuevo."}
              </p>
              {failed.expired ? (
                <a
                  href={`${ROUTES.login}?next=${encodeURIComponent(ROUTES.home)}`}
                  className="mt-2 inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-2"
                >
                  Iniciar sesión
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => void send(failed.question, true)}
                  className="mt-2 min-h-11 font-semibold text-brand-700 underline underline-offset-2"
                >
                  Reintentar
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-1.5 border-t border-line px-3 py-2">
          <div
            id={`${panelId}-options`}
            className="grid max-h-[min(15rem,30dvh)] grid-cols-2 gap-1.5 overflow-y-auto overscroll-contain"
            role="group"
            aria-label={allOptionsOpen ? "Todas las opciones" : "Consultas sugeridas"}
          >
            {visibleOptions.map((question) => (
              <button
                key={question.topic}
                type="button"
                title={question.label}
                disabled={busy}
                onClick={() =>
                  void send({
                    text: question.label,
                    topic: question.topic,
                  })
                }
                className="min-h-9 rounded-control border border-line bg-surface px-2 py-1.5 text-xs font-medium text-ink transition-colors duration-150 ease-out hover:border-brand-200 hover:bg-brand-50 pointer-coarse:min-h-11 disabled:cursor-wait disabled:opacity-60"
              >
                {question.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-expanded={allOptionsOpen}
            aria-controls={`${panelId}-options`}
            onClick={() => setAllOptionsOpen((current) => !current)}
            className="inline-flex min-h-7 items-center gap-1 self-end rounded-sm px-1 text-xs font-medium text-brand-700 hover:underline hover:underline-offset-2 pointer-coarse:min-h-11"
          >
            {allOptionsOpen ? "Ocultar opciones" : "Ver todas las opciones"}
            <Icon
              name="chevron-right"
              className={cn("size-3", allOptionsOpen ? "rotate-90" : "-rotate-90")}
            />
          </button>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <label htmlFor={`${panelId}-message`} className="sr-only">
              Escribe tu pregunta
            </label>
            <input
              id={`${panelId}-message`}
              type="text"
              value={draft}
              maxLength={MESSAGE_MAX_LENGTH}
              autoComplete="off"
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribe tu pregunta…"
              className="min-h-11 min-w-0 flex-1 rounded-control border border-field-border bg-surface px-3 text-base text-ink"
            />
            <button
              type="submit"
              aria-label="Enviar pregunta"
              disabled={busy || !draft.trim()}
              className="flex size-11 flex-none items-center justify-center rounded-control bg-brand-600 text-white transition-colors duration-150 ease-out hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="arrow-right" width={20} height={20} />
            </button>
          </form>
        </div>
      </div>

      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Abrir asistente virtual"
        title="Abrir VetBot"
        onClick={() => onOpenChange(true)}
        className={cn(
          "fixed right-0 bottom-6 z-40 h-16 w-12 items-center justify-center rounded-l-full bg-brand-600 text-white shadow-lg transition-colors duration-150 ease-out hover:bg-brand-700",
          open ? "hidden" : "inline-flex",
        )}
      >
        <Icon name="bot" width={28} height={28} />
      </button>
    </>
  );
}
