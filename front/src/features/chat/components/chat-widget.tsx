"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/cn";
import { useAuth } from "@/features/auth/auth-provider";
import { useAuthDialog } from "@/features/auth/components/auth-dialog";
import { useChat, type ChatQuestion } from "@/features/chat/chat-provider";
import { answerCount, chatOptions, choiceKey } from "@/features/chat/suggestions";
import { ROUTES } from "@/lib/constants";
import type { SessionUser } from "@/types/auth";

const MESSAGE_MAX_LENGTH = 200;
const REPLY_ACTION_CLASS =
  "flex min-h-9 w-full items-center justify-between gap-2 py-1 text-left font-semibold text-brand-700 underline-offset-2 hover:underline focus-visible:-outline-offset-2 pointer-coarse:min-h-11";

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
  const { messages, busy, progress, failed, submitQuestion } = useChat();
  const [draft, setDraft] = useState("");
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!open || authDialogOpen) return;
    const frame = requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open, authDialogOpen]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = messages.length === 1 ? 0 : log.scrollHeight;
  }, [messages, open, busy, failed]);

  if (authDialogOpen) return null;

  function close() {
    onOpenChange(false);
    requestAnimationFrame(() => toggleRef.current?.focus({ preventScroll: true }));
  }

  async function send(question: ChatQuestion, retry = false) {
    const focused = document.activeElement;
    if (!(await submitQuestion(question, retry))) return;
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || busy) return;
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
      {open && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-40 bg-navy/50 sm:hidden"
        />
      )}
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
          "fixed inset-x-0 bottom-0 z-40 flex h-[min(35rem,calc(100dvh-1rem))] flex-col overflow-hidden rounded-t-card bg-surface shadow-xl outline-none transition-[opacity,translate,visibility] duration-200 ease-out motion-reduce:translate-x-0 motion-reduce:transition-none sm:left-auto sm:h-[min(35rem,calc(100dvh-3rem))] sm:w-[25rem] sm:rounded-card sm:border sm:border-line",
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
            const hasReplyActions =
              !!choices?.length || !!message.reply.links?.length || message.reply.bookingAction;
            return (
              <div
                key={message.id}
                className={cn(
                  "min-w-0 max-w-[80%] rounded-control px-4 pt-2.5 [overflow-wrap:anywhere]",
                  hasReplyActions ? "pb-0" : "pb-2.5",
                  message.from === "user"
                    ? "self-end rounded-br-sm bg-brand-600 text-white"
                    : "self-start rounded-bl-sm border border-line bg-surface text-ink",
                )}
              >
                <p className="text-pretty">
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
                {hasReplyActions && (
                  <ul className="mt-2 divide-y divide-line border-t border-line">
                    {choices?.map((choice) => (
                      <li key={choice.patientId ?? choice.label}>
                        <button
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
                          className={cn(
                            REPLY_ACTION_CLASS,
                            "disabled:cursor-wait disabled:opacity-60",
                          )}
                        >
                          <span className="min-w-0">{choice.label}</span>
                          <Icon name="chevron-right" className="size-4 shrink-0" />
                        </button>
                      </li>
                    ))}
                    {message.reply.bookingAction && (
                      <li>
                        <button type="button" onClick={goToBooking} className={REPLY_ACTION_CLASS}>
                          Ir a agendar
                          <Icon name="arrow-right" className="size-4 shrink-0" />
                        </button>
                      </li>
                    )}
                    {message.reply.links?.map((link) => (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          onClick={() => {
                            if (link.href.startsWith("/")) onOpenChange(false);
                          }}
                          {...(link.external && { target: "_blank", rel: "noopener noreferrer" })}
                          className={REPLY_ACTION_CLASS}
                        >
                          <span className="min-w-0">{link.label}</span>
                          <Icon name="arrow-right" className="size-4 shrink-0" />
                        </Link>
                      </li>
                    ))}
                  </ul>
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

        <div className="flex min-h-0 flex-col gap-1 bg-canvas px-3 pb-2">
          <details className="group max-h-[min(19rem,40dvh)] min-h-0 self-end overscroll-contain open:w-full open:overflow-y-auto scrollbar-thin">
            <summary className="sticky top-0 flex min-h-7 cursor-pointer list-none items-center justify-end gap-1 bg-canvas px-1 text-sm font-medium text-brand-700 hover:underline hover:underline-offset-2 focus-visible:-outline-offset-4 pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Ver opciones</span>
              <span className="hidden group-open:inline">Ocultar opciones</span>
              <Icon
                name="chevron-right"
                className="size-3.5 shrink-0 -rotate-90 group-open:rotate-90"
              />
            </summary>
            <ul aria-label="Opciones de VetBot" className="grid grid-cols-2 gap-x-2 pt-1">
              {chatOptions(user?.role === "OWNER").map(({ topic, label, icon }) => (
                <li key={topic} className="flex min-w-0">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(event) => {
                      panelRef.current?.focus({ preventScroll: true });
                      event.currentTarget.closest("details")?.removeAttribute("open");
                      void send({ text: label, topic });
                    }}
                    className="flex min-h-9 w-full min-w-0 items-center justify-center gap-1.5 px-px py-1 text-center text-sm font-semibold text-brand-700 hover:underline hover:underline-offset-2 focus-visible:-outline-offset-4 pointer-coarse:min-h-11 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Icon name={icon} className="size-4 shrink-0" />
                    <span className="min-w-0">{label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
          <form onSubmit={handleSubmit} className="flex shrink-0 gap-2">
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
