"use client";

import { useState } from "react";
import { Field } from "@/components/ui/field";
import {
  formatDurationInput,
  formatProcedureDuration,
  parseProcedureDuration,
} from "@/lib/appointment-procedures";
import { applyInputFormat } from "@/lib/input-format";

type ProcedureDurationFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  showError?: boolean;
};

export function ProcedureDurationField({
  value,
  onChange,
  disabled,
  showError,
}: ProcedureDurationFieldProps) {
  const [touched, setTouched] = useState(false);
  const minutes = parseProcedureDuration(value);
  const invalid = (touched || showError) && minutes === undefined;

  return (
    <Field
      label="Duración"
      placeholder="00:00"
      inputMode="numeric"
      maxLength={5}
      hint="Escribe cuatro números. De 00:30 a 08:00, en pasos de 30 min."
      error={invalid ? "Escribe una duración válida." : undefined}
      value={value}
      required
      disabled={disabled}
      onChange={(event) => {
        const input = event.currentTarget;
        const { inputType } = event.nativeEvent as InputEvent;
        const formatted = formatDurationInput(input.value, inputType === "insertFromPaste");
        applyInputFormat(input, formatted, ":", inputType);
        onChange(formatted);
      }}
      onBlur={() => {
        setTouched(true);
        if (minutes === undefined) return;
        const formatted = formatProcedureDuration(minutes);
        if (formatted !== value) onChange(formatted);
      }}
    />
  );
}
