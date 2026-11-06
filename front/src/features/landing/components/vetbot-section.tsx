"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ChatWidget } from "@/features/landing/components/chat-widget";
import { SectionHeading } from "@/features/landing/components/section-heading";
import { faqReply } from "@/services/chat";

// Conversación de muestra con respuestas reales de VetBot; solo ilustra, así que se oculta a los lectores de pantalla.
const SAMPLE_CHAT: { from: "user" | "bot"; text: string }[] = [
  { from: "user", text: "Hola, ¿atienden los sábados?" },
  { from: "bot", text: faqReply("hours").text },
  { from: "user", text: "Quiero agendar la vacuna de mi perro." },
  { from: "bot", text: faqReply("booking").text },
];

export function VetBotSection() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      <section id="asistente" aria-labelledby="asistente-title" className="scroll-mt-28 bg-surface">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col items-start gap-6">
            <SectionHeading
              id="asistente-title"
              title="¿Tienes una duda? Pregúntale a nuestro asistente"
            >
              VetBot responde preguntas frecuentes sobre servicios, horarios y ubicación, y te lleva
              a agendar tu cita. No reemplaza la consulta con el veterinario.
            </SectionHeading>
            <Button onClick={() => setChatOpen(true)}>
              <Icon name="message" width={20} height={20} />
              Abrir chat
            </Button>
          </div>
          <figure className="flex flex-col gap-3 rounded-card border border-line bg-canvas p-5">
            <ol aria-hidden="true" className="flex flex-col gap-3">
              {SAMPLE_CHAT.map((message) => (
                <li
                  key={message.text}
                  className={
                    message.from === "user"
                      ? "max-w-[85%] self-end rounded-control rounded-br-sm bg-brand-600 px-4 py-2.5 text-white"
                      : "flex max-w-[85%] flex-col gap-1 self-start"
                  }
                >
                  {message.from === "bot" ? (
                    <>
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                        <span className="size-2 rounded-full bg-success" />
                        VetBot
                      </span>
                      <span className="rounded-control rounded-bl-sm border border-line bg-surface px-4 py-2.5 text-ink">
                        {message.text}
                      </span>
                    </>
                  ) : (
                    message.text
                  )}
                </li>
              ))}
            </ol>
            <figcaption className="text-center text-sm text-subtle">
              Ejemplo de conversación con VetBot
            </figcaption>
          </figure>
        </div>
      </section>
      <ChatWidget open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}
