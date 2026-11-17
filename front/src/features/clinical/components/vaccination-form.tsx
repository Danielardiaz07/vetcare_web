"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Field } from "@/components/ui/field";
import { LoadingState } from "@/components/ui/loading-state";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { appointmentErrorMessage } from "@/features/appointments/errors";
import { vaccinationSchema, type VaccinationFormInput } from "@/features/clinical/schemas";
import { clinicDateOf } from "@/lib/clinic-time";
import { FIELD_LIMITS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { listVaccines, registerVaccination } from "@/services/clinical";
import type { Patient, Vaccination, Vaccine } from "@/types/domain";

type Load<T> = { status: "loading" } | { status: "error" } | { status: "ready"; data: T };

type VaccinationFormProps = {
  patient: Patient;
  appointmentId: string;
  onRegistered: (vaccination: Vaccination) => void;
};

// RF-19: cada vacuna se guarda al registrarla; en una atención se pueden aplicar varias.
export function VaccinationForm({ patient, appointmentId, onRegistered }: VaccinationFormProps) {
  const { show } = useToast();
  const today = useMemo(() => clinicDateOf(new Date()), []);
  const [vaccines, setVaccines] = useState<Load<Vaccine[]>>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [applied, setApplied] = useState<Vaccination[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const emptyForm: VaccinationFormInput = {
    vaccineId: "",
    lot: "",
    appliedAt: today,
    nextDoseAt: "",
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VaccinationFormInput>({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    let active = true;
    setVaccines({ status: "loading" });
    listVaccines()
      .then((data) => {
        if (active) setVaccines({ status: "ready", data });
      })
      .catch(() => {
        if (active) setVaccines({ status: "error" });
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const onSubmit = handleSubmit(async ({ nextDoseAt, ...input }) => {
    setFormError(null);
    try {
      const vaccination = await registerVaccination({
        ...input,
        patientId: patient.id,
        ...(nextDoseAt && { nextDoseAt }),
        // RN-53: la primera vacuna cierra la cita; las siguientes ya no la llevan.
        ...(applied.length === 0 && { appointmentId }),
      });
      setApplied((current) => [...current, vaccination]);
      onRegistered(vaccination);
      reset(emptyForm);
      show(`Vacuna ${vaccination.vaccine.name} registrada para ${patient.name}.`, "success");
    } catch (error) {
      setFormError(appointmentErrorMessage(error));
    }
  });

  if (vaccines.status === "loading") return <LoadingState rows={2} />;
  if (vaccines.status === "error") {
    return <ErrorState onRetry={() => setReloadKey((key) => key + 1)} />;
  }

  return (
    <div className="flex flex-col gap-5">
      {applied.length > 0 && (
        <section className="flex flex-col gap-2 rounded-card border border-success-border bg-success-bg p-4">
          <h3 className="font-semibold text-ink">Aplicadas en esta atención</h3>
          <ul className="flex flex-col gap-1 text-ink">
            {applied.map((item) => (
              <li key={item.id}>
                {item.vaccine.name} · lote {item.lot}
                {item.nextDoseAt && ` · próxima dosis ${formatDate(item.nextDoseAt)}`}
              </li>
            ))}
          </ul>
        </section>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        <Select label="Vacuna" error={errors.vaccineId?.message} {...register("vaccineId")}>
          <option value="" disabled>
            Elige la vacuna
          </option>
          {vaccines.data.map((vaccine) => (
            <option key={vaccine.id} value={vaccine.id}>
              {vaccine.name}
            </option>
          ))}
        </Select>
        <Field
          label="Lote"
          maxLength={FIELD_LIMITS.VACCINE_LOT_MAX}
          autoComplete="off"
          error={errors.lot?.message}
          {...register("lot")}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Fecha de aplicación"
            type="date"
            max={today}
            error={errors.appliedAt?.message}
            {...register("appliedAt")}
          />
          <Field
            label="Próxima dosis (opcional)"
            type="date"
            min={today}
            error={errors.nextDoseAt?.message}
            {...register("nextDoseAt")}
          />
        </div>
        {formError && (
          <p role="alert" className="text-sm text-danger">
            {formError}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} className="self-start">
          Registrar vacuna
        </Button>
      </form>
    </div>
  );
}
