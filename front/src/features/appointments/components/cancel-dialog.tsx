"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BookingDetails, type DetailRow } from "@/features/appointments/components/booking-details";
import { appointmentErrorMessage } from "@/features/appointments/errors";
import {
  CANCEL_REASONS,
  cancelReasonText,
  cancelSchema,
  type CancelFormInput,
  type CancelReason,
} from "@/features/appointments/schemas";
import { FIELD_LIMITS } from "@/lib/constants";
import { cancelAppointment } from "@/services/appointments";
import type { Appointment } from "@/types/domain";

type CancelDialogProps = {
  appointment: Appointment;
  details: DetailRow[];
  open: boolean;
  onClose: () => void;
  onCancelled: (appointment: Appointment) => void;
};

export function CancelDialog({ open, onClose, ...props }: CancelDialogProps) {
  return (
    <Modal open={open} title="¿Cancelar esta cita?" onClose={onClose}>
      {open && <CancelForm onClose={onClose} {...props} />}
    </Modal>
  );
}

function CancelForm({
  appointment,
  details,
  onClose,
  onCancelled,
}: Omit<CancelDialogProps, "open">) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CancelFormInput>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { other: "" },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null);
    try {
      onCancelled(await cancelAppointment(appointment.id, cancelReasonText(input)));
    } catch (error) {
      setFormError(appointmentErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <BookingDetails rows={details} />
      <p className="text-muted">El horario quedará libre para otra persona.</p>
      <Select label="Motivo" error={errors.choice?.message} defaultValue="" {...register("choice")}>
        <option value="" disabled>
          Elige el motivo
        </option>
        {(Object.keys(CANCEL_REASONS) as CancelReason[]).map((choice) => (
          <option key={choice} value={choice}>
            {CANCEL_REASONS[choice]}
          </option>
        ))}
      </Select>
      {watch("choice") === "OTHER" && (
        <Textarea
          label="Cuéntanos el motivo"
          maxLength={FIELD_LIMITS.APPOINTMENT_REASON_MAX}
          error={errors.other?.message}
          {...register("other")}
        />
      )}
      {formError && (
        <p
          role="alert"
          className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
        >
          {formError}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={isSubmitting} onClick={onClose}>
          No, mantener
        </Button>
        <Button type="submit" variant="danger" loading={isSubmitting}>
          Sí, cancelar
        </Button>
      </div>
    </form>
  );
}
