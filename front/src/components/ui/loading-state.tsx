type LoadingStateProps = {
  rows?: number;
  label?: string;
};

const DEFAULT_ROWS = 3;

export function LoadingState({
  rows = DEFAULT_ROWS,
  label = "Cargando datos…",
}: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <p className="text-sm text-muted">{label}</p>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="h-24 animate-pulse rounded-card bg-divider motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
