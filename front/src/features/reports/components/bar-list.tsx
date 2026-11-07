export type BarItem = {
  key: string;
  label: string;
  value: number;
  // El número tal como se lee: "8 citas", "$ 702.100".
  valueText: string;
};

type BarListProps = {
  title: string;
  items: BarItem[];
};

const PERCENT = 100;

// Barras horizontales con CSS: la barra es decorativa; la etiqueta y el número están escritos.
export function BarList({ title, items }: BarListProps) {
  const max = Math.max(0, ...items.map((item) => item.value));

  return (
    <ul aria-label={title} className="flex flex-col gap-3">
      {items.map((item) => (
        <li
          key={item.key}
          className="grid grid-cols-[minmax(0,8rem)_1fr_auto] items-center gap-3 text-sm"
        >
          <span className="truncate text-muted">{item.label}</span>
          <span aria-hidden="true" className="h-3 rounded-r-sm bg-divider">
            <span
              className="block h-full rounded-r-sm bg-brand-600"
              style={{ width: max ? `${(item.value / max) * PERCENT}%` : 0 }}
            />
          </span>
          <span className="text-right font-semibold whitespace-nowrap text-ink">
            {item.valueText}
          </span>
        </li>
      ))}
    </ul>
  );
}
