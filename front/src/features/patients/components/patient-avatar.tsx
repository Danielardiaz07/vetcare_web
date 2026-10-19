// Mientras no exista la subida de fotos se muestra la inicial del nombre.
export function PatientAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
