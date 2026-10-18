"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { appointmentErrorMessage } from "@/features/appointments/errors";
import { consultationSchema, type ConsultationFormInput } from "@/features/clinical/schemas";
import { FIELD_LIMITS, ROUTES } from "@/lib/constants";
import { saveConsultation } from "@/services/clinical";
import type { Appointment, Patient } from "@/types/domain";

const { CLINICAL_TEXT_MAX, LONG_TEXT_MAX } = FIELD_LIMITS;

type ConsultationFormProps = {
  appointment: Appointment;
  patient: Patient;
};

// RF-18: la fórmula es texto libre y no descuenta inventario (D-27).
export function ConsultationForm({ appointment, patient }: ConsultationFormProps) {
  const router = useRouter();
  const { show } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ConsultationFormInput>({
    resolver: zodResolver(consultationSchema),
    defaultValues: { weightKg: patient.weightKg, prescription: "", internalNotes: "" },
  });

  const onSubmit = handleSubmit(async ({ prescription, internalNotes, ...input }) => {
    setFormError(null);
    try {
      await saveConsultation(appointment.id, {
        ...input,
        ...(prescription && { prescription }),
        ...(internalNotes && { internalNotes }),
      });
      show(`Atención de ${patient.name} guardada. La cita quedó como Atendida.`, "success");
      router.push(ROUTES.panelAgenda);
    } catch (error) {
      setFormError(appointmentErrorMessage(error));
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5 rounded-card border border-line bg-surface p-5"
    >
      <h2 className="text-lg font-semibold text-ink">Consulta</h2>
      <Textarea
        label="Síntomas"
        maxLength={CLINICAL_TEXT_MAX}
        error={errors.symptoms?.message}
        {...register("symptoms")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Peso (kg)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          error={errors.weightKg?.message}
          {...register("weightKg", { valueAsNumber: true })}
        />
        <Field
          label="Temperatura (°C)"
          type="number"
          inputMode="decimal"
          step="0.1"
          min="0"
          error={errors.temperatureC?.message}
          {...register("temperatureC", { valueAsNumber: true })}
        />
      </div>
      <Textarea
        label="Diagnóstico"
        maxLength={CLINICAL_TEXT_MAX}
        error={errors.diagnosis?.message}
        {...register("diagnosis")}
      />
      <Textarea
        label="Tratamiento"
        maxLength={CLINICAL_TEXT_MAX}
        error={errors.treatment?.message}
        {...register("treatment")}
      />
      <Textarea
        label="Fórmula (opcional)"
        hint="Medicamentos, dosis y frecuencia."
        maxLength={LONG_TEXT_MAX}
        error={errors.prescription?.message}
        {...register("prescription")}
      />
      <Field
        label="Costo de la consulta (COP)"
        type="number"
        inputMode="numeric"
        step="1"
        min="0"
        hint="Sin puntos ni signo de pesos."
        error={errors.cost?.message}
        {...register("cost", { valueAsNumber: true })}
      />
      {/* RN-42: estas notas nunca se muestran al propietario. */}
      <Textarea
        label="Notas internas (opcional)"
        hint="Solo la ve el personal."
        maxLength={LONG_TEXT_MAX}
        error={errors.internalNotes?.message}
        {...register("internalNotes")}
      />
      {formError && (
        <p role="alert" className="text-sm text-danger">
          {formError}
        </p>
      )}
      <Button type="submit" loading={isSubmitting} className="self-start">
        Guardar atención
      </Button>
    </form>
  );
}
