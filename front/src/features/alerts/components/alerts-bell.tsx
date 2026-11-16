"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { usePortalAlerts } from "@/features/alerts/hooks/use-portal-alerts";
import { ALERT_LABELS, alertDate, alertHref } from "@/features/alerts/labels";

const MAX_BADGE_COUNT = 99;
const PANEL_WIDTH_REM = 22;
const PANEL_EDGE_GAP = 16;
const PANEL_ANCHOR_GAP = 12;

export function AlertsBell({ userId }: { userId: string }) {
  const pathname = usePathname();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const { state, seenIds, unread, reload, markSeen } = usePortalAlerts(userId);
  const alerts = state.alerts;

  const positionPanel = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) return;

    const anchor = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    const width = Math.min(PANEL_WIDTH_REM * rem, viewportWidth - PANEL_EDGE_GAP * 2);
    const left = Math.max(
      PANEL_EDGE_GAP,
      Math.min(anchor.left, viewportWidth - width - PANEL_EDGE_GAP),
    );
    const top = anchor.bottom + PANEL_ANCHOR_GAP;
    const pointer = Math.max(
      PANEL_EDGE_GAP,
      Math.min(anchor.left + anchor.width / 2 - left, width - PANEL_EDGE_GAP),
    );
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.width = `${width}px`;
    panel.style.setProperty("--bell-anchor-x", `${pointer}px`);
    panel.style.setProperty(
      "--alerts-max-height",
      `${Math.max(0, window.innerHeight - top - PANEL_EDGE_GAP)}px`,
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    positionPanel();
    window.addEventListener("resize", positionPanel);
    window.addEventListener("scroll", positionPanel);
    const observer = new ResizeObserver(positionPanel);
    if (triggerRef.current?.parentElement) observer.observe(triggerRef.current.parentElement);
    return () => {
      window.removeEventListener("resize", positionPanel);
      window.removeEventListener("scroll", positionPanel);
      observer.disconnect();
    };
  }, [open, positionPanel]);

  useEffect(() => {
    if (panelRef.current?.matches(":popover-open")) panelRef.current.hidePopover();
  }, [pathname]);

  const label = unread > 0 ? `Avisos, ${unread} sin ver` : "Avisos";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        popoverTarget={panelId}
        aria-label={label}
        title={label}
        aria-haspopup="dialog"
        aria-controls={panelId}
        aria-expanded={open}
        className={cn(
          "relative inline-flex size-11 shrink-0 items-center justify-center rounded-control transition-colors duration-150 ease-out hover:bg-brand-50",
          open ? "bg-brand-50 text-brand-700" : "text-brand-600",
        )}
      >
        <Icon name="bell" className="size-5" />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute top-0 right-0 min-w-5 rounded-full bg-brand-600 px-1 text-center text-xs leading-5 font-semibold text-white tabular-nums"
          >
            {unread > MAX_BADGE_COUNT ? "99+" : unread}
          </span>
        )}
        {state.status === "error" && <span className="sr-only">No pudimos cargar tus avisos.</span>}
      </button>
      <div
        ref={panelRef}
        id={panelId}
        popover="auto"
        role="dialog"
        aria-labelledby={`${panelId}-title`}
        onBeforeToggle={(event) => {
          if (event.newState === "open") positionPanel();
        }}
        onToggle={(event) => {
          const visible = event.newState === "open";
          setOpen(visible);
          if (visible) reload();
        }}
        className="fixed inset-auto m-0 overflow-visible rounded-chip border border-line bg-surface p-0 text-ink shadow-soft"
      >
        <span
          aria-hidden="true"
          style={{ left: "var(--bell-anchor-x)" }}
          className="pointer-events-none absolute -top-px size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-t border-l border-line bg-surface"
        />
        <div
          aria-busy={state.status === "loading"}
          className="max-h-[var(--alerts-max-height)] overflow-y-auto rounded-[inherit]"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
            <h2 id={`${panelId}-title`} className="text-lg font-semibold">
              Avisos
            </h2>
            <button
              type="button"
              popoverTarget={panelId}
              popoverTargetAction="hide"
              aria-label="Cerrar avisos"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-muted hover:bg-brand-50"
            >
              <Icon name="close" className="size-5" />
            </button>
          </div>
          {state.status === "loading" && alerts === null && (
            <div className="p-4">
              <LoadingState rows={2} />
            </div>
          )}
          {state.status === "error" && (
            <div role="alert" className="flex flex-col items-start gap-3 p-4">
              <p>
                {alerts === null
                  ? "No pudimos cargar tus avisos."
                  : "No pudimos actualizar tus avisos."}
              </p>
              <Button variant="secondary" onClick={reload}>
                Reintentar
              </Button>
            </div>
          )}
          {alerts?.length === 0 && (
            <p className="p-6 text-sm text-muted">No tienes avisos por ahora.</p>
          )}
          {alerts && alerts.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-x-3 px-4 py-1">
                <p role="status" className="text-sm text-muted">
                  {unread} sin ver
                </p>
                <button
                  type="button"
                  disabled={unread === 0}
                  onClick={() => markSeen(alerts.map((alert) => alert.id))}
                  className="min-h-11 rounded-control text-sm font-medium text-brand-700 underline-offset-4 hover:underline disabled:cursor-default disabled:text-subtle disabled:no-underline"
                >
                  Marcar todos como vistos
                </button>
              </div>
              <ul className="divide-y divide-divider">
                {alerts.map((alert) => {
                  const details = ALERT_LABELS[alert.kind];
                  const unseen = !seenIds.has(alert.id);
                  return (
                    <li key={alert.id}>
                      <Link
                        href={alertHref(alert)}
                        onClick={() => {
                          markSeen([alert.id]);
                          panelRef.current?.hidePopover();
                        }}
                        className={cn(
                          "flex gap-3 px-4 py-4 transition-colors duration-150 ease-out hover:bg-brand-50",
                          unseen && "bg-brand-50/50",
                        )}
                      >
                        <Icon
                          name={details.icon}
                          className={cn("mt-0.5 size-5 shrink-0", details.color)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold">{details.label}</span>
                            {unseen && (
                              <span className="text-xs font-medium text-brand-700">Nuevo</span>
                            )}
                          </div>
                          <p className="mt-1 text-sm break-words">{alert.message}</p>
                          <time dateTime={alert.date} className="mt-2 block text-xs text-subtle">
                            {alertDate(alert)}
                          </time>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}
