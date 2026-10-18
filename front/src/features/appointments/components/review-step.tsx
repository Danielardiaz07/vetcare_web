"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookingDetails, type DetailRow } from "@/features/appointments/components/booking-details";
import { reviewSchema, type ReviewFormInput } from "@/features/appointments/schemas";
import { FIELD_LIMITS } from "@/lib/constants";

type ReviewStepProps = {
  rows: DetailRow[];
  defaultReason: string;
  error: ReactNode;
  onBack: (reason: string) => void;
  onConfirm: (reason: string) => Promise<void>;
};

export function ReviewStep({ rows, defaultReason, error, onBack, onConfirm }: ReviewStepProps) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { reason: defaultReason },
  });

  const onSubmit = handleSubmit(({ reason }) => onConfirm(reason));

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <BookingDetails rows={rows} />
      <Textarea
        label="Motivo de la cita (opcional)"
        hint="Cuéntanos qué le pasa o qué necesita tu mascota."
        maxLength={FIELD_LIMITS.APPOINTMENT_REASON_MAX}
        error={errors.reason?.message}
        {...register("reason")}
      />
      {error && (
        <div
          role="alert"
          className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="secondary"
          disabled={isSubmitting}
          onClick={() => onBack(getValues("reason"))}
        >
          Atrás
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Confirmar cita
        </Button>
      </div>
    </form>
  );
}
