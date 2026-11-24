"use client";

import { forwardRef, type ChangeEvent } from "react";
import { Field } from "@/components/ui/field";
import { FIELD_LIMITS } from "@/lib/constants";
import { applyInputFormat } from "@/lib/input-format";

const groupPesos = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const pastedCop = /^-?(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d+)?$/;

function formatDefault(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "";
  const [pesos = "", cents] = String(value).split(".");
  return cents ? `${groupPesos(pesos)},${cents}` : groupPesos(pesos);
}

type CopFieldProps = {
  name: string;
  label: string;
  defaultValue?: number;
  decimals?: boolean;
  error?: string;
  onChange: (value: number) => void;
  onBlur: () => void;
};

export const CopField = forwardRef<HTMLInputElement, CopFieldProps>(function CopField(
  { name, label, defaultValue, decimals = false, error, onChange, onBlur },
  ref,
) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const { data, inputType } = event.nativeEvent as InputEvent;
    let value = input.value;
    if (data === "." && inputType === "insertText") {
      const dot = (input.selectionStart ?? value.length) - 1;
      value = `${value.slice(0, dot)},${value.slice(dot + 1)}`;
    }
    value = value.replace(/[$\s]/g, "");
    if (inputType === "insertFromPaste" && value && !pastedCop.test(value)) {
      onChange(NaN);
      return;
    }

    const parts = /^(-?)([\d.]*)(?:,(\d*))?$/.exec(value);
    if (!parts) {
      onChange(NaN);
      return;
    }

    const [, sign = "", integer = "", fraction] = parts;
    const digits = integer.replaceAll(".", "").replace(/^0+(?=\d)/, "");
    const pesos = digits || (fraction !== undefined ? "0" : "");
    const cents = fraction === undefined ? "" : `,${fraction}`;
    applyInputFormat(input, `${sign}${groupPesos(pesos)}${cents}`, ".", inputType);
    const number =
      pesos && (fraction?.length ?? 0) <= FIELD_LIMITS.PRICE_DECIMALS
        ? Number(`${sign}${pesos}.${fraction ?? ""}`)
        : NaN;
    onChange(number);
  }

  return (
    <Field
      ref={ref}
      name={name}
      label={label}
      type="text"
      inputMode={decimals ? "decimal" : "numeric"}
      defaultValue={formatDefault(defaultValue)}
      hint={decimals ? "Usa coma para los decimales." : undefined}
      error={error}
      onChange={handleChange}
      onBlur={onBlur}
    />
  );
});
