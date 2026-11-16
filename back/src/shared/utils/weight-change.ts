import { WEIGHT_ALERT_PERCENT } from "@/config/constants";

const PERCENT = 100;
const RATE_DECIMALS = 10; // un decimal: 12,5 %

export interface WeightChange {
  previousKg: number;
  currentKg: number;
  percent: number; // con signo: positivo si subió
  flagged: boolean;
}

// RN-81: se marca cuando el peso varía WEIGHT_ALERT_PERCENT % o más entre dos consultas seguidas.
export function weightChange(previousKg: number, currentKg: number): WeightChange {
  const percent =
    Math.round(((currentKg - previousKg) / previousKg) * PERCENT * RATE_DECIMALS) / RATE_DECIMALS;
  return { previousKg, currentKg, percent, flagged: Math.abs(percent) >= WEIGHT_ALERT_PERCENT };
}
