import { ApiError, requestStream } from "@/services/http-client";

type EventHandlers = {
  onOpen: () => void;
  onChanged: () => void;
  onRetry: (milliseconds: number) => void;
};

export async function readAppointmentEvents(signal: AbortSignal, handlers: EventHandlers) {
  const response = await requestStream("/appointments/events", signal);
  if (!response.body || !response.headers.get("Content-Type")?.includes("text/event-stream")) {
    await response.body?.cancel();
    throw new ApiError(502, "INVALID_EVENT_STREAM", "La actualización en vivo no está disponible.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";
  let data: string[] = [];
  const cancel = () => void reader.cancel().catch(() => {});
  signal.addEventListener("abort", cancel, { once: true });

  function line(value: string) {
    if (!value) {
      if (event === "appointment.changed") {
        let payload: unknown;
        try {
          payload = JSON.parse(data.join("\n"));
        } catch {
          payload = null;
        }
        if (
          typeof payload === "object" &&
          payload !== null &&
          "appointmentId" in payload &&
          typeof payload.appointmentId === "string" &&
          payload.appointmentId.length > 0
        ) {
          handlers.onChanged();
        }
      }
      event = "";
      data = [];
      return;
    }
    const separator = value.indexOf(":");
    const field = separator < 0 ? value : value.slice(0, separator);
    const content = separator < 0 ? "" : value.slice(separator + 1).replace(/^ /, "");
    if (field === "event") event = content;
    if (field === "data") data.push(content);
    if (field === "retry" && /^\d+$/.test(content)) {
      handlers.onRetry(Math.min(30_000, Math.max(1_000, Number(content))));
    }
  }

  try {
    if (signal.aborted) return;
    handlers.onOpen();
    while (!signal.aborted) {
      const chunk = await reader.read();
      if (chunk.done || signal.aborted) return;
      buffer += decoder.decode(chunk.value, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n")) >= 0) {
        line(buffer.slice(0, end).replace(/\r$/, ""));
        buffer = buffer.slice(end + 1);
      }
      if (buffer.length + data.join("").length > 65_536) {
        throw new Error("Evento de agenda demasiado grande");
      }
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
