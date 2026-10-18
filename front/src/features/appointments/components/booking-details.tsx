export type DetailRow = { label: string; value: string };

// Lista de datos de la cita; la usan la revisión y el comprobante.
export function BookingDetails({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1">
          <dt className="text-sm text-subtle">{label}</dt>
          <dd className="font-semibold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
