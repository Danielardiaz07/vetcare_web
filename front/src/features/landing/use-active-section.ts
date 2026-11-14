"use client";

import { useEffect, useState, type RefObject } from "react";

// Margen para que una sección que llega exactamente al borde del menú cuente como la actual.
const EDGE_TOLERANCE_PX = 1;

// D-45: la sección activa es la que está justo debajo del borde inferior del encabezado, que es
// donde queda cada sección al elegirla en el menú. Arriba del todo, la primera.
export function useActiveSection(
  sectionIds: readonly string[],
  headerRef: RefObject<HTMLElement | null>,
): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = sectionIds.join(",");

  useEffect(() => {
    const sections = key
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null)
      // En el orden de la página, sin importar el orden en que lleguen los ids.
      .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    if (sections.length === 0) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (headerRef.current?.getBoundingClientRect().bottom ?? 0) + EDGE_TOLERANCE_PX;
      const current = sections.filter((section) => section.getBoundingClientRect().top <= line);
      setActive((current.at(-1) ?? sections[0])?.id ?? null);
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [key, headerRef]);

  return active;
}
