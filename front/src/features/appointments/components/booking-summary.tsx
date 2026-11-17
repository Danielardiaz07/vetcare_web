import { StatusBadge } from "@/components/ui/status-badge";

export type SummaryRow = { label: string; value: string | null };

// Va llenando lo elegido; lo que aún no se elige se marca con "Falta".
export function BookingSummary({ rows }: { rows: SummaryRow[] }) {
  return (
    <aside
      aria-labelledby="booking-summary-title"
      className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
    >
      <h2 id="booking-summary-title" className="text-lg font-semibold text-ink">
        Resumen
      </h2>
      <dl className="flex flex-col gap-3">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex flex-col gap-1">
            <dt className="text-sm text-subtle">{label}</dt>
            <dd className="text-ink">{value ?? <StatusBadge tone="warning">Falta</StatusBadge>}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
