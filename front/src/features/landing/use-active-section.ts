"use client";

import { useEffect, useState } from "react";

// La sección cuenta como vista cuando cruza la franja media de la pantalla, no apenas asoma.
const VIEWPORT_BAND = "-45% 0px -50% 0px";

export function useActiveSection(sectionIds: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  const key = sectionIds.join(",");

  useEffect(() => {
    const sections = key
      .split(",")
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: VIEWPORT_BAND },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [key]);

  return active;
}
