type LoadingStateProps = {
  rows?: number;
};

const DEFAULT_ROWS = 3;

export function LoadingState({ rows = DEFAULT_ROWS }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Cargando…</span>
      <div className="h-8 w-1/3 animate-pulse rounded-control bg-divider motion-reduce:animate-none" />
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-card bg-divider motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
