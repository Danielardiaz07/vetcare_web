"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getMyAlerts } from "@/services/alerts";
import { APPOINTMENTS_CHANGED_EVENT } from "@/services/appointments";
import type { PortalAlert } from "@/types/alerts";

type AlertsState = {
  status: "loading" | "error" | "ready";
  alerts: PortalAlert[] | null;
};

function readSeenIds(key: string): Set<string> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (Array.isArray(stored)) {
      return new Set(stored.filter((id): id is string => typeof id === "string"));
    }
  } catch {
    // La campana sigue funcionando si el navegador bloquea el almacenamiento.
  }
  return new Set();
}

export function usePortalAlerts(userId: string) {
  const pathname = usePathname();
  const storageKey = `vetcare-alerts-seen:${userId}`;
  const [state, setState] = useState<AlertsState>({ status: "loading", alerts: null });
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    setSeenIds(readSeenIds(storageKey));
    function syncSeen(event: StorageEvent) {
      if (event.key === storageKey || event.key === null) setSeenIds(readSeenIds(storageKey));
    }
    window.addEventListener("storage", syncSeen);
    return () => window.removeEventListener("storage", syncSeen);
  }, [storageKey]);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, status: "loading" }));
    getMyAlerts()
      .then(({ data }) => {
        if (active) setState({ status: "ready", alerts: data });
      })
      .catch(() => {
        if (active) setState((current) => ({ ...current, status: "error" }));
      });
    return () => {
      active = false;
    };
  }, [userId, pathname, reloadKey]);

  useEffect(() => {
    window.addEventListener("focus", reload);
    window.addEventListener(APPOINTMENTS_CHANGED_EVENT, reload);
    return () => {
      window.removeEventListener("focus", reload);
      window.removeEventListener(APPOINTMENTS_CHANGED_EVENT, reload);
    };
  }, [reload]);

  function markSeen(ids: string[]) {
    if (state.alerts === null) return;
    const currentIds = new Set(state.alerts.map((alert) => alert.id));
    const next = new Set(
      [...readSeenIds(storageKey), ...seenIds, ...ids].filter((id) => currentIds.has(id)),
    );
    setSeenIds(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...next]));
    } catch {
      // Se conserva el estado en memoria para esta sesión.
    }
  }

  const unread = (state.alerts ?? []).filter((alert) => !seenIds.has(alert.id)).length;

  return { state, seenIds, unread, reload, markSeen };
}
