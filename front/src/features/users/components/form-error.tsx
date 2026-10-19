export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger"
    >
      {message}
    </p>
  );
}
