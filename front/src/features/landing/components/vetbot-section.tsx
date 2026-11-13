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
      {/* D-45: bloque arena dentro del ancho de la página, el único toque cálido de la portada. */}
      <section id="asistente" aria-labelledby="asistente-title" className="scroll-mt-header-bar">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-10 rounded-block border border-sand-border bg-sand p-[clamp(1.75rem,4.5vw,3.5rem)] lg:flex-row lg:items-center">
            <div className="flex min-w-0 flex-col items-start gap-6 lg:flex-[1_1_23.75rem]">
              <SectionHeading
                id="asistente-title"
                title="¿Tienes una duda? Pregúntale a nuestro asistente."
              >
                VetBot responde preguntas frecuentes sobre servicios, horarios y ubicación, y te
                lleva a agendar tu cita. No reemplaza la consulta con el veterinario.
              </SectionHeading>
              <Button onClick={() => setChatOpen(true)}>
                <Icon name="message" width={20} height={20} />
                Abrir chat
              </Button>
            </div>
            <figure className="flex min-w-0 flex-col gap-3 lg:flex-[1_1_21.25rem]">
              <ol aria-hidden="true" className="rise-on-view flex flex-col gap-2.5">
                {SAMPLE_CHAT.map((message) => (
                  <li
                    key={message.text}
                    className={
                      message.from === "user"
                        ? "max-w-[85%] self-end rounded-chip rounded-br-[4px] bg-brand-600 px-3.5 py-2.5 text-[15px] leading-normal text-white"
                        : "flex max-w-[85%] flex-col items-start gap-2 self-start"
                    }
                  >
                    {message.from === "bot" ? (
                      <>
                        <span className="flex items-center gap-2 px-0.5 text-sm font-semibold text-ink">
                          <span className="size-2 rounded-full bg-brand-500" />
                          VetBot
                        </span>
                        <span className="rounded-chip rounded-bl-[4px] border border-line bg-surface px-3.5 py-2.5 text-[15px] leading-normal text-ink">
                          {message.text}
                        </span>
                      </>
                    ) : (
                      message.text
                    )}
                  </li>
                ))}
              </ol>
              <figcaption className="text-sm text-subtle">
                Ejemplo de conversación con VetBot
              </figcaption>
            </figure>
          </div>
        </div>
      </section>
      <ChatWidget open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}
