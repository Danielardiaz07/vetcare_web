"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { periodSchema, type PeriodInput } from "@/features/reports/schemas";

type PeriodFilterProps = {
  defaultValues: PeriodInput;
  loading: boolean;
  onApply: (period: PeriodInput) => void;
};

export function PeriodFilter({ defaultValues, loading, onApply }: PeriodFilterProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PeriodInput>({ resolver: zodResolver(periodSchema), defaultValues });

  return (
    <form
      onSubmit={handleSubmit(onApply)}
      noValidate
      aria-label="Periodo"
      className="flex flex-col gap-4 sm:flex-row sm:items-start"
    >
      <div className="sm:w-48">
        <Field type="date" label="Desde" error={errors.from?.message} {...register("from")} />
      </div>
      <div className="sm:w-48">
        <Field type="date" label="Hasta" error={errors.to?.message} {...register("to")} />
      </div>
      <Button type="submit" loading={loading} className="sm:mt-6.5">
        Consultar
      </Button>
    </form>
  );
}
