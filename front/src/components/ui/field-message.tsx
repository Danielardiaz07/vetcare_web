type FieldMessageProps = {
  hintId: string;
  errorId: string;
  hint?: string;
  error?: string;
};

export function FieldMessage({ hintId, errorId, hint, error }: FieldMessageProps) {
  return (
    <>
      {hint && !error && (
        <p id={hintId} className="text-sm text-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

export function describedBy(hintId: string, errorId: string, hint?: string, error?: string) {
  if (error) return errorId;
  if (hint) return hintId;
  return undefined;
}
