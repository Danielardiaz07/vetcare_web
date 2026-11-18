"use client";

import { useEffect, useState } from "react";
import { env } from "@/lib/env";
import { readAppointmentEvents } from "@/services/appointment-events";
import { ApiError } from "@/services/http-client";

type Connection = "connecting" | "live" | "retrying" | "unavailable";

export function useAgendaEvents(sessionId: string | null, onChanged: () => void): Connection {
  const [connection, setConnection] = useState<Connection>("connecting");

  useEffect(() => {
    if (!sessionId || env.NEXT_PUBLIC_USE_MOCKS) {
      setConnection("unavailable");
      return;
    }

    let active = true;
    let controller: AbortController | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let changeTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 3_000;
    let suggestedDelay = 3_000;
    let unavailable = false;

    const refresh = () => {
      if (!active) return;
      clearTimeout(changeTimer);
      changeTimer = setTimeout(() => {
        if (active) onChanged();
      }, 200);
    };
    const stop = () => {
      clearTimeout(retryTimer);
      clearTimeout(changeTimer);
      controller?.abort();
      controller = null;
    };

    async function connect() {
      if (
        !active ||
        unavailable ||
        controller ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;

      const current = new AbortController();
      controller = current;
      let openedAt = 0;
      let delay = retryDelay;
      setConnection("connecting");
      try {
        await readAppointmentEvents(current.signal, {
          onOpen: () => {
            if (!active || current.signal.aborted) return;
            openedAt = Date.now();
            setConnection("live");
            refresh();
          },
          onChanged: refresh,
          onRetry: (milliseconds) => {
            suggestedDelay = milliseconds;
          },
        });
      } catch (error: unknown) {
        if (current.signal.aborted || !active) return;
        if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
          unavailable = true;
          setConnection("unavailable");
          return;
        }
        if (error instanceof ApiError && error.status === 429) delay = 60_000;
      } finally {
        if (controller === current) controller = null;
      }
      if (!active || current.signal.aborted) return;
      if (openedAt && Date.now() - openedAt >= 30_000) {
        retryDelay = suggestedDelay;
        delay = suggestedDelay;
      }
      delay = Math.max(delay, retryDelay);
      retryDelay = Math.min(30_000, Math.max(suggestedDelay, retryDelay * 2));
      setConnection("retrying");
      retryTimer = setTimeout(() => void connect(), delay);
    }

    const resume = () => {
      stop();
      if (document.visibilityState === "visible" && navigator.onLine) {
        void connect();
      } else if (!unavailable) {
        setConnection("retrying");
      }
    };
    void connect();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("offline", resume);
    return () => {
      active = false;
      stop();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("offline", resume);
    };
  }, [sessionId, onChanged]);

  return connection;
}
