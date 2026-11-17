"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { isNetworkError, NETWORK_ERROR_MESSAGE } from "@/features/auth/errors";
import { otpSchema } from "@/features/auth/schemas";
import { OTP_LENGTH, OTP_RESEND_SECONDS } from "@/lib/constants";
import { resendOtp, verifyOtp } from "@/services/auth";
import { ApiError } from "@/services/http-client";

const UNPROCESSABLE_ENTITY = 422;
const TOO_MANY_REQUESTS = 429;
const SECOND_MS = 1000;

const EMPTY_DIGITS = Array.from({ length: OTP_LENGTH }, () => "");

// La API usa un solo mensaje para código incorrecto, vencido o con demasiados intentos fallidos.
function otpErrorMessage(error: unknown): string {
  if (isNetworkError(error) || !(error instanceof ApiError)) return NETWORK_ERROR_MESSAGE;
  if (error.status === UNPROCESSABLE_ENTITY) {
    return "El código es incorrecto o ya venció. Revísalo o pide uno nuevo";
  }
  if (error.status === TOO_MANY_REQUESTS) {
    return "Hiciste demasiados intentos. Espera un momento y vuelve a intentarlo";
  }
  return error.message;
}

type OtpFormProps = {
  email: string;
  onVerified: () => Promise<void>;
};

export function OtpForm({ email, onVerified }: OtpFormProps) {
  const { show } = useToast();
  const [digits, setDigits] = useState(EMPTY_DIGITS);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OTP_RESEND_SECONDS);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), SECOND_MS);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const focusInput = (index: number) =>
    inputsRef.current[Math.min(Math.max(index, 0), OTP_LENGTH - 1)]?.focus();

  function fillFrom(index: number, value: string) {
    const typed = value.replace(/\D/g, "").slice(0, OTP_LENGTH - index);
    if (!typed) return;
    setDigits((current) => {
      const next = [...current];
      typed.split("").forEach((digit, offset) => {
        next[index + offset] = digit;
      });
      return next;
    });
    focusInput(index + typed.length);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index]) {
      event.preventDefault();
      setDigits((current) => current.map((digit, i) => (i === index - 1 ? "" : digit)));
      focusInput(index - 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    fillFrom(index, event.clipboardData.getData("text"));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = otpSchema.safeParse({ code: digits.join("") });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? null);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await verifyOtp(email, parsed.data.code);
      await onVerified();
    } catch (verifyError) {
      setError(otpErrorMessage(verifyError));
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      await resendOtp(email);
      setDigits(EMPTY_DIGITS);
      setSecondsLeft(OTP_RESEND_SECONDS);
      show("Te enviamos un código nuevo", "success");
      focusInput(0);
    } catch (resendError) {
      setError(otpErrorMessage(resendError));
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-ink">Revisa tu correo</h3>
        <p className="text-sm text-muted">
          Escribe el código de {OTP_LENGTH} dígitos que enviamos a{" "}
          <span className="font-semibold text-ink">{email}</span>.
        </p>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Código de verificación</legend>
        <div className="grid grid-cols-6 gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputsRef.current[index] = element;
              }}
              value={digit}
              onChange={(event) => fillFrom(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={(event) => handlePaste(index, event)}
              onFocus={(event) => event.target.select()}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              aria-label={`Dígito ${index + 1} de ${OTP_LENGTH}`}
              aria-invalid={error ? true : undefined}
              className={`h-12 w-full min-w-0 rounded-control border bg-surface text-center text-xl font-semibold text-ink ${
                error ? "border-danger" : "border-field-border"
              }`}
            />
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </fieldset>
      <Button type="submit" loading={submitting}>
        Verificar
      </Button>
      <Button
        variant="secondary"
        onClick={handleResend}
        loading={resending}
        disabled={secondsLeft > 0}
      >
        {secondsLeft > 0 ? `Reenviar código en ${secondsLeft} s` : "Reenviar código"}
      </Button>
    </form>
  );
}
