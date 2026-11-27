"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/loading-state";
import { appointmentErrorMessage } from "@/features/appointments/errors";
import { clinicDateOf, formatClinicTime, formatLongDate } from "@/lib/clinic-time";
import { CHECK_IN_CODE_MAX, checkScannerLink, scanCheckIn } from "@/services/check-in";
import { ApiError } from "@/services/http-client";

const SCAN_INTERVAL_MS = 200;
const MAX_FRAME_SIZE = 640;

type LinkState = "checking" | "valid" | "invalid" | "unreachable";
type CameraState = { status: "off" | "starting" | "on" } | { status: "error"; message: string };
type Outcome = { tone: "success" | "danger"; title: string; detail: string };

function cameraErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "No hay permiso para usar la cámara. Permite su uso en el navegador y vuelve a activarla.";
    }
    if (error.name === "NotFoundError") {
      return "No encontramos una cámara. Abre el enlace en un dispositivo con cámara.";
    }
    if (error.name === "NotReadableError") {
      return "La cámara está ocupada o no está disponible. Cierra otras aplicaciones que la usen y vuelve a intentarlo.";
    }
  }
  return "No pudimos activar la cámara. Vuelve a intentarlo.";
}

export function CheckInScanner({ token }: { token: string }) {
  const [link, setLink] = useState<LinkState>("checking");
  const [linkAttempt, setLinkAttempt] = useState(0);
  const [camera, setCamera] = useState<CameraState>({ status: "off" });
  const [cameraRequested, setCameraRequested] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [foreground, setForeground] = useState(true);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blockedRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    const onVisibility = () => setForeground(document.visibilityState === "visible");
    const onPageHide = () => setForeground(false);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onVisibility);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onVisibility);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLink("checking");
    checkScannerLink(token, controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setLink("valid");
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLink(error instanceof ApiError && error.status === 404 ? "invalid" : "unreachable");
        }
      });
    return () => controller.abort();
  }, [token, linkAttempt]);

  const submit = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (blockedRef.current || !code) return;
      blockedRef.current = true;
      if (code.length > CHECK_IN_CODE_MAX) {
        setOutcome({
          tone: "danger",
          title: "Este QR no es un código de llegada",
          detail: "Pide al propietario el QR de Mis citas o el de su recordatorio.",
        });
        return;
      }
      setBusy(true);
      try {
        const result = await scanCheckIn(token, code);
        if (!mountedRef.current) return;
        setOutcome({
          tone: "success",
          title: `${result.patientName} ya llegó a su cita`,
          detail: `${formatLongDate(clinicDateOf(new Date(result.startsAt)))} · ${formatClinicTime(result.startsAt)}. La llegada quedó registrada.`,
        });
      } catch (error: unknown) {
        if (!mountedRef.current) return;
        setOutcome({
          tone: "danger",
          title: "No se registró la llegada",
          detail: appointmentErrorMessage(error),
        });
        if (error instanceof ApiError && error.status === 404) {
          setLinkAttempt((attempt) => attempt + 1);
        }
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!cameraRequested || !foreground || link !== "valid" || outcome) {
      setCamera({ status: "off" });
      return;
    }
    if (!window.isSecureContext) {
      setCamera({
        status: "error",
        message: "La cámara necesita un enlace HTTPS. Usa el enlace seguro de la clínica.",
      });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera({
        status: "error",
        message: "Este navegador no permite usar la cámara aquí. Prueba otro navegador.",
      });
      return;
    }

    let cancelled = false;
    let stream: MediaStream | null = null;
    const video = videoRef.current;
    setCamera({ status: "starting" });
    const stop = () => {
      stream?.getTracks().forEach((track) => track.stop());
      if (video && video.srcObject === stream) {
        video.pause();
        video.srcObject = null;
      }
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then(async (media) => {
        if (cancelled || !video) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        video.srcObject = media;
        await video.play();
        if (!cancelled) setCamera({ status: "on" });
      })
      .catch((error: unknown) => {
        stop();
        if (!cancelled) setCamera({ status: "error", message: cameraErrorMessage(error) });
      });

    return () => {
      cancelled = true;
      stop();
    };
  }, [cameraRequested, foreground, link, outcome, cameraAttempt]);

  useEffect(() => {
    if (camera.status !== "on" || !foreground || link !== "valid") return;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (blockedRef.current || !video || !canvas || video.readyState < 2 || !video.videoWidth)
        return;
      try {
        const scale = Math.min(1, MAX_FRAME_SIZE / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas no disponible");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const found = jsQR(frame.data, frame.width, frame.height, {
          inversionAttempts: "dontInvert",
        });
        if (found?.data) void submit(found.data);
      } catch {
        setCameraRequested(false);
        setOutcome({
          tone: "danger",
          title: "No pudimos leer la imagen",
          detail: "Vuelve a activar la cámara e intenta escanear el QR de nuevo.",
        });
      }
    }, SCAN_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [camera.status, foreground, link, submit]);

  if (link === "checking") return <LoadingState />;
  if (link !== "valid") {
    return (
      <section role="alert" className="flex flex-col items-start gap-3">
        <h1 className="text-xl font-semibold text-ink">
          {link === "invalid" ? "Enlace no disponible" : "No pudimos comprobar el enlace"}
        </h1>
        <p className="text-muted">
          {link === "invalid"
            ? "Pide a la clínica el enlace o el QR de acceso vigente para recepción."
            : "Revisa tu conexión y vuelve a intentarlo."}
        </p>
        <Button variant="secondary" onClick={() => setLinkAttempt((attempt) => attempt + 1)}>
          Reintentar
        </Button>
      </section>
    );
  }

  return (
    <section className="flex min-w-0 flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Registrar llegada</h1>
        <p className="text-muted">Escanea el QR de Mis citas o del recordatorio del propietario.</p>
      </div>

      {outcome ? (
        <div className="flex flex-col gap-4">
          <div
            role={outcome.tone === "danger" ? "alert" : "status"}
            className={`rounded-card border p-5 break-words ${
              outcome.tone === "success"
                ? "border-success-border bg-success-bg text-success"
                : "border-danger-border bg-danger-bg text-danger"
            }`}
          >
            <h2 className="text-lg font-semibold">{outcome.title}</h2>
            <p className="mt-1">{outcome.detail}</p>
          </div>
          <Button
            onClick={() => {
              blockedRef.current = false;
              setOutcome(null);
            }}
          >
            {outcome.tone === "success" ? "Escanear otra llegada" : "Volver a intentar"}
          </Button>
        </div>
      ) : null}

      <div hidden={Boolean(outcome)} className="flex flex-col gap-3">
        <div className="relative overflow-hidden rounded-card bg-navy">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-label="Vista de la cámara para leer el QR de llegada"
            className="aspect-[4/3] max-h-[50svh] min-h-48 w-full object-cover"
          />
          <canvas ref={canvasRef} hidden />
          {camera.status !== "on" && (
            <p className="absolute inset-0 flex items-center justify-center p-5 text-center text-white">
              {camera.status === "starting" ? "Activando la cámara…" : "La cámara está apagada"}
            </p>
          )}
        </div>
        {camera.status === "error" && (
          <p role="alert" className="text-sm text-danger">
            {camera.message}
          </p>
        )}
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            if (camera.status === "on" || camera.status === "starting") {
              setCameraRequested(false);
            } else {
              setCameraRequested(true);
              setCameraAttempt((attempt) => attempt + 1);
            }
          }}
        >
          {camera.status === "on" || camera.status === "starting"
            ? "Detener cámara"
            : camera.status === "error"
              ? "Reintentar cámara"
              : "Activar cámara"}
        </Button>
        <p role="status" className="text-sm text-muted">
          {busy
            ? "Registrando llegada…"
            : camera.status === "on"
              ? "Apunta al QR y mantenlo completo dentro de la imagen."
              : "Activa la cámara cuando estés listo para escanear."}
        </p>
      </div>
    </section>
  );
}
