import { addDays, daysBetween } from "@/lib/clinic-time";
import type { DashboardReport } from "@/types/domain";

export function percentageChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function revenueDays(
  range: DashboardReport["range"],
  revenue: DashboardReport["revenue"]["byDay"],
) {
  const totals = new Map<string, number>();
  for (const row of revenue) totals.set(row.date, (totals.get(row.date) ?? 0) + row.total);
  return Array.from({ length: daysBetween(range.from, range.to) + 1 }, (_, index) => {
    const date = addDays(range.from, index);
    return { date, total: totals.get(date) ?? 0 };
  });
}
