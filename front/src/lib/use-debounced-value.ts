"use client";

import { useEffect, useState } from "react";

// Devuelve el valor solo cuando deja de cambiar durante `delayMs`; evita una petición por cada tecla.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
