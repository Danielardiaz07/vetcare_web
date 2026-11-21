"use client";

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  compact?: boolean;
  headerActions?: ReactNode;
};

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
  compact = false,
  headerActions,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleClose() {
    openerRef.current?.focus();
    onClose();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    const dialog = event.currentTarget;
    if (event.target !== dialog) return;
    const { left, right, top, bottom } = dialog.getBoundingClientRect();
    const { clientX, clientY } = event;
    if (clientX < left || clientX >= right || clientY < top || clientY >= bottom) {
      dialog.close();
    }
  }

  const closeButton = (
    <button
      type="button"
      onClick={() => dialogRef.current?.close()}
      aria-label="Cerrar"
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-control text-muted hover:bg-canvas"
    >
      <Icon name="close" />
    </button>
  );

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleClose}
      onClick={handleBackdropClick}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-card bg-surface p-2 text-ink backdrop:bg-navy/50 open:flex print:p-0 print:open:block",
        wide ? "max-w-5xl" : "max-w-lg",
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-col overflow-y-auto overscroll-contain print:overflow-visible",
          compact ? "gap-2 p-1" : "gap-4 p-4",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="min-w-0 text-lg font-semibold [overflow-wrap:anywhere]">
            {title}
          </h2>
          {headerActions ? (
            <div className="flex shrink-0 items-center gap-2">
              {headerActions}
              {closeButton}
            </div>
          ) : (
            closeButton
          )}
        </div>
        {children}
      </div>
    </dialog>
  );
}
