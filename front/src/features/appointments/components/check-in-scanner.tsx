"use client";

import jsQR from "jsqr";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { formatClinicTime } from "@/lib/clinic-time";
import { checkScannerLink, scanCheckIn } from "@/services/check-in";
import { ApiError } from "@/services/http-client";

const NOT_FOUND = 404;
const SCAN_INTERVAL_MS = 200;
const RESULT_VISIBLE_MS = 4000;
// Mientras el QR sigue frente a la cámara no se vuelve a enviar el mismo código.
const SAME_CODE_COOLDOWN_MS = 15_000;
const MAX_FRAME_WIDTH_PX = 640;

type LinkState = "checking" | "valid" | "invalid" | "unreachable";
type CameraState = "starting" | "on" | "denied" | "unsupported";
type Outcome = { tone: "success" | "danger"; title: string; detail?: string };

const OUTCOME_CLASSES: Record<Outcome["tone"], string> = {
  success: "border-success-border bg-success-bg text-success",
  danger: "border-danger-border bg-danger-bg text-danger",
};

// D-66, RN-85: página de recepción sin sesión. El enlace con el token secreto es lo que autoriza escanear.
export function CheckInScanner({ token }: { token: string }) {
  const [link, setLink] = useState<LinkState>("checking");
  const [camera, setCamera] = useState<CameraState>("starting");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [manualCode, setManualCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const busyRef = useRef(false);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    checkScannerLink(token)
      .then(() => !cancelled && setLink("valid"))
      .catch((error: unknown) => {
        if (cancelled) return;
        setLink(
          error instanceof ApiError && error.status === NOT_FOUND ? "invalid" : "unreachable",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = useCallback(
    async (code: string) => {
      if (busyRef.current) return;
      busyRef.current = true;
      try {
        const result = await scanCheckIn(token, code);
        setOutcome({
          tone: "success",
          title: `${result.patientName} ya llegó a su cita`,
          detail: `Cita de las ${formatClinicTime(result.startsAt)}. La llegada quedó registrada.`,
        });
      } catch (error) {
        setOutcome({
          tone: "danger",
          title: "No se registró la llegada",
          detail:
            error instanceof ApiError
              ? error.message
              : "No pudimos conectar con el servidor. Intenta de nuevo.",
        });
      }
      hideTimerRef.current = setTimeout(() => {
        setOutcome(null);
        busyRef.current = false;
      }, RESULT_VISIBLE_MS);
    },
    [token],
  );

  useEffect(() => {
    if (link !== "valid") return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("unsupported");
      return;
    }
    let stream: MediaStream | null = null;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(async (media) => {
        if (cancelled) return media.getTracks().forEach((track) => track.stop());
        stream = media;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        await video.play();
        setCamera("on");
      })
      .catch(() => !cancelled && setCamera("denied"));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [link]);

  useEffect(() => {
    if (camera !== "on") return;
    const timer = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (busyRef.current || !video || !canvas || video.videoWidth === 0) return;

      const scale = Math.min(1, MAX_FRAME_WIDTH_PX / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const found = jsQR(frame.data, frame.width, frame.height, {
        inversionAttempts: "dontInvert",
      });
      if (!found?.data) return;

      const last = lastScanRef.current;
      const now = Date.now();
      if (last && last.code === found.data && now - last.at < SAME_CODE_COOLDOWN_MS) return;
      lastScanRef.current = { code: found.data, at: now };
      void submit(found.data);
    }, SCAN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [camera, submit]);

  useEffect(
    () => () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    [],
  );

  function onManualSubmit(event: FormEvent) {
    event.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setManualCode("");
    void submit(code);
  }

  if (link === "checking") return <p className="text-muted">Comprobando el enlace…</p>;
  if (link !== "valid") {
    return (
      <section role="alert" className="space-y-2 rounded-card border border-line bg-surface p-6">
        <h1 className="text-xl font-semibold text-ink">
          {link === "invalid" ? "Enlace no válido" : "No pudimos comprobar el enlace"}
        </h1>
        <p className="text-muted">
          {link === "invalid"
            ? "Este enlace no existe o fue reemplazado. Pide a la clínica el enlace de escaneo vigente."
            : "Revisa tu conexión y recarga la página."}
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Registrar llegada</h1>
        <p className="text-muted">Apunta la cámara al QR que muestra el propietario.</p>
      </div>

      <div className="relative overflow-hidden rounded-card border border-line bg-navy">
        <video ref={videoRef} playsInline muted className="aspect-square w-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        {camera !== "on" && (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-white">
            {camera === "starting" && "Activando la cámara…"}
            {camera === "denied" &&
              "No hay permiso para usar la cámara. Actívalo en el navegador y recarga la página."}
            {camera === "unsupported" &&
              "Este navegador no permite usar la cámara aquí. Usa el campo de abajo."}
          </p>
        )}
      </div>

      <div aria-live="polite">
        {outcome && (
          <div
            role={outcome.tone === "danger" ? "alert" : "status"}
            className={`rounded-card border p-5 ${OUTCOME_CLASSES[outcome.tone]}`}
          >
            <p className="text-lg font-semibold">{outcome.title}</p>
            {outcome.detail && <p className="mt-1">{outcome.detail}</p>}
          </div>
        )}
      </div>

      <form onSubmit={onManualSubmit} className="flex flex-col gap-3 border-t border-line pt-5">
        <Field
          label="¿Sin cámara? Escribe o pega el código"
          hint="También sirve un lector de código de barras USB: el código se escribe aquí."
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={!manualCode.trim()}
          className="self-start"
        >
          Registrar llegada
        </Button>
      </form>
    </section>
  );
}
