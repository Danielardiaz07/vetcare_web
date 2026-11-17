"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { appointmentErrorMessage } from "@/features/appointments/errors";
import {
  admissionSchema,
  dischargeSchema,
  labExamSchema,
  surgerySchema,
  type AdmissionFormInput,
  type DischargeFormInput,
  type LabExamFormInput,
  type SurgeryFormInput,
} from "@/features/clinical/schemas";
import { clinicDateOf } from "@/lib/clinic-time";
import { FIELD_LIMITS } from "@/lib/constants";
import {
  admitPatient,
  dischargePatient,
  registerLabExam,
  registerSurgery,
} from "@/services/clinical";

const { PROCEDURE_MAX, EXAM_TYPE_MAX, LONG_TEXT_MAX, CLINICAL_TEXT_MAX } = FIELD_LIMITS;

type FormProps = {
  onCancel: () => void;
  onSaved: () => void;
};

type PatientFormProps = FormProps & { patientId: string };

// Cada formulario muestra el error de la API tal cual (p. ej. una segunda internación abierta).
function useSubmitError() {
  const [error, setError] = useState<string | null>(null);
  async function run(action: () => Promise<unknown>, onSaved: () => void) {
    setError(null);
    try {
      await action();
      onSaved();
    } catch (cause) {
      setError(appointmentErrorMessage(cause));
    }
  }
  return { error, run };
}

export function SurgeryForm({ patientId, onCancel, onSaved }: PatientFormProps) {
  const today = useMemo(() => clinicDateOf(new Date()), []);
  const { error, run } = useSubmitError();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SurgeryFormInput>({
    resolver: zodResolver(surgerySchema),
    defaultValues: { procedure: "", performedAt: today, notes: "" },
  });

  const onSubmit = handleSubmit(({ notes, ...input }) =>
    run(() => registerSurgery({ ...input, patientId, ...(notes && { notes }) }), onSaved),
  );

  return (
    <FormShell
      onSubmit={onSubmit}
      onCancel={onCancel}
      error={error}
      busy={isSubmitting}
      label="Registrar cirugía"
    >
      <Field
        label="Procedimiento"
        maxLength={PROCEDURE_MAX}
        error={errors.procedure?.message}
        {...register("procedure")}
      />
      <Field
        label="Fecha"
        type="date"
        max={today}
        error={errors.performedAt?.message}
        {...register("performedAt")}
      />
      <Textarea
        label="Notas (opcional)"
        maxLength={LONG_TEXT_MAX}
        error={errors.notes?.message}
        {...register("notes")}
      />
    </FormShell>
  );
}

export function LabExamForm({ patientId, onCancel, onSaved }: PatientFormProps) {
  const today = useMemo(() => clinicDateOf(new Date()), []);
  const { error, run } = useSubmitError();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LabExamFormInput>({
    resolver: zodResolver(labExamSchema),
    defaultValues: { examType: "", performedAt: today, results: "" },
  });

  const onSubmit = handleSubmit((input) =>
    run(() => registerLabExam({ ...input, patientId }), onSaved),
  );

  return (
    <FormShell
      onSubmit={onSubmit}
      onCancel={onCancel}
      error={error}
      busy={isSubmitting}
      label="Registrar examen"
    >
      <Field
        label="Tipo de examen"
        hint="Por ejemplo: hemograma, coprológico."
        maxLength={EXAM_TYPE_MAX}
        error={errors.examType?.message}
        {...register("examType")}
      />
      <Field
        label="Fecha"
        type="date"
        max={today}
        error={errors.performedAt?.message}
        {...register("performedAt")}
      />
      <Textarea
        label="Resultados"
        maxLength={LONG_TEXT_MAX}
        error={errors.results?.message}
        {...register("results")}
      />
    </FormShell>
  );
}

export function AdmissionForm({ patientId, onCancel, onSaved }: PatientFormProps) {
  const { error, run } = useSubmitError();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdmissionFormInput>({
    resolver: zodResolver(admissionSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = handleSubmit(({ reason }) =>
    run(() => admitPatient(patientId, reason), onSaved),
  );

  return (
    <FormShell
      onSubmit={onSubmit}
      onCancel={onCancel}
      error={error}
      busy={isSubmitting}
      label="Internar"
    >
      <p className="text-muted">La fecha y hora de ingreso las registra el sistema.</p>
      <Textarea
        label="Motivo"
        maxLength={CLINICAL_TEXT_MAX}
        error={errors.reason?.message}
        {...register("reason")}
      />
    </FormShell>
  );
}

export function DischargeForm({
  hospitalizationId,
  onCancel,
  onSaved,
}: FormProps & { hospitalizationId: string }) {
  const { error, run } = useSubmitError();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DischargeFormInput>({
    resolver: zodResolver(dischargeSchema),
    defaultValues: { notes: "" },
  });

  const onSubmit = handleSubmit(({ notes }) =>
    run(() => dischargePatient(hospitalizationId, notes || undefined), onSaved),
  );

  return (
    <FormShell
      onSubmit={onSubmit}
      onCancel={onCancel}
      error={error}
      busy={isSubmitting}
      label="Dar de alta"
    >
      <Textarea
        label="Notas de egreso (opcional)"
        maxLength={CLINICAL_TEXT_MAX}
        error={errors.notes?.message}
        {...register("notes")}
      />
    </FormShell>
  );
}

type FormShellProps = {
  onSubmit: () => void;
  onCancel: () => void;
  error: string | null;
  busy: boolean;
  label: string;
  children: ReactNode;
};

function FormShell({ onSubmit, onCancel, error, busy, label, children }: FormShellProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {children}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={busy}>
          {label}
        </Button>
      </div>
    </form>
  );
}
