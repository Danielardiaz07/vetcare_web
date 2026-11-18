"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
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

export function MobileScannerAccess({ onClose }: { onClose: () => void }) {
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
          <p className="text-sm text-muted">Usa “Con código” mientras tanto.</p>
        </div>
      )}
      {state.status === "ready" && (
        <>
          {imageFailed ? (
            <p role="alert" className="text-sm text-muted">
              No pudimos mostrar el QR. Usa el enlace.
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
          <Field
            label="Enlace del escáner de recepción"
            value={state.data.url}
            readOnly
            autoComplete="off"
            spellCheck={false}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full min-w-0 text-base"
          />
        </>
      )}
      <div className="flex flex-wrap gap-2">
        {state.status === "error" && (
          <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar acceso móvil
          </Button>
        )}
        {state.status === "ready" && (
          <>
            <Button variant="secondary" onClick={() => void copyLink(state.data.url)}>
              Copiar enlace
            </Button>
            <a
              href={state.data.url}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-brand-600 px-5 font-medium text-white transition-colors duration-150 ease-out hover:bg-brand-700"
            >
              Abrir escáner
            </a>
          </>
        )}
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      {state.status === "ready" && (
        <p role="status" className={copyMessage ? "text-sm text-muted" : "sr-only"}>
          {copyMessage}
        </p>
      )}
    </section>
  );
}
