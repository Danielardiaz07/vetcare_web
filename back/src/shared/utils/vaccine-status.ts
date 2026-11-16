import { VACCINE_DUE_SOON_DAYS } from "@/config/constants";
import { addDays } from "@/shared/utils/clinic-time";

export type VaccineStatus = "UP_TO_DATE" | "DUE_SOON" | "OVERDUE"; // RN-49

// RN-49: estado de la última dosis; sin próxima dosis cuenta al día. Las fechas son AAAA-MM-DD de la clínica.
export function vaccineStatusOf(nextDoseAt: string | null, today: string): VaccineStatus {
  if (!nextDoseAt) return "UP_TO_DATE";
  if (nextDoseAt < today) return "OVERDUE";
  return nextDoseAt <= addDays(today, VACCINE_DUE_SOON_DAYS) ? "DUE_SOON" : "UP_TO_DATE";
}
