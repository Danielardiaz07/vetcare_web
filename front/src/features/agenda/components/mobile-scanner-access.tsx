"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { LoadingState } from "@/components/ui/loading-state";
import { appointmentErrorMessage } from "@/features/appointments/errors";
import { getScannerAccess, type ScannerAccess } from "@/services/check-in";
import { ApiError } from "@/services/http-client";

type Load =
  | { status: "loading" }
  | { status: "ready"; data: ScannerAccess }
  | { status: "error"; message: string };

function scannerLinkIssue(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      return "Solicita un enlace HTTPS para usar la cámara del celular.";
    }
    const token = decodeURIComponent(url.pathname.split("/")[2] ?? "");
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !/^\/scan\/[^/]+\/?$/.test(url.pathname) ||
      token.length < 32 ||
      token.length > 128
    ) {
      return "El enlace no es válido. Solicita revisar el acceso de recepción.";
    }
    return null;
  } catch {
    return "El enlace no es válido. Solicita revisar el acceso de recepción.";
  }
}

export function MobileScannerAccess() {
  const [state, setState] = useState<Load>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [imageFailed, setImageFailed] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: "loading" });
    setImageFailed(false);
    setCopyMessage("");
    getScannerAccess(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const issue = scannerLinkIssue(data.url);
        setState(issue ? { status: "error", message: issue } : { status: "ready", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message =
          error instanceof ApiError && error.status === 404
            ? "El acceso móvil no está configurado. Solicita revisar el enlace HTTPS de recepción."
            : error instanceof ApiError && (error.status === 401 || error.status === 403)
              ? "Inicia sesión en recepción para consultar el acceso."
              : appointmentErrorMessage(error);
        setState({ status: "error", message });
      });
    return () => controller.abort();
  }, [reloadKey]);

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("Enlace copiado");
    } catch {
      setCopyMessage("No se pudo copiar. Selecciona el enlace y cópialo.");
    }
  }

  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label="Acceso al escáner móvil">
      <p className="text-sm text-muted">
        Escanea este QR con tu celular para abrir el escáner de recepción, sin iniciar sesión.
      </p>
      {state.status === "loading" && <LoadingState />}
      {state.status === "error" && (
        <div className="flex flex-col items-start gap-1">
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
          <p className="text-sm text-muted">Registra la llegada desde la cita en la agenda.</p>
        </div>
      )}
      {state.status === "ready" && (
        <>
          {imageFailed ? (
            <p role="alert" className="text-sm text-muted">
              No pudimos mostrar el QR. Copia el enlace y ábrelo en tu celular.
            </p>
          ) : (
            <Image
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(state.data.qrSvg)}`}
              alt="QR para abrir el escáner de recepción en el celular"
              width={208}
              height={208}
              unoptimized
              loading="eager"
              onError={() => setImageFailed(true)}
              className="h-auto w-52 max-w-full self-center bg-white"
            />
          )}
          <div className="relative min-w-0">
            <Field
              label="Enlace del escáner de recepción"
              value={state.data.url}
              readOnly
              autoComplete="off"
              spellCheck={false}
              onFocus={(event) => event.currentTarget.select()}
              className="w-full min-w-0 pr-14 text-base"
            />
            <button
              type="button"
              aria-label="Copiar enlace"
              title="Copiar enlace"
              onClick={() => void copyLink(state.data.url)}
              className="absolute right-0 bottom-0 inline-flex size-11 items-center justify-center rounded-r-control border border-field-border bg-surface text-brand-700 transition-colors duration-150 ease-out hover:bg-brand-50"
            >
              <Icon name={copyMessage === "Enlace copiado" ? "check" : "copy"} className="size-5" />
            </button>
          </div>
        </>
      )}
      {state.status === "error" && (
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => setReloadKey((key) => key + 1)}
        >
          Reintentar acceso móvil
        </Button>
      )}
      {state.status === "ready" && (
        <p role="status" className={copyMessage ? "text-sm text-muted" : "sr-only"}>
          {copyMessage}
        </p>
      )}
    </section>
  );
}
