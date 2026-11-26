"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { cn } from "@/components/ui/cn";
import { ROUTES } from "@/lib/constants";

type SectionHeaderBrandProps = {
  label: string;
  hideWordmarkOnMobile?: boolean;
};

export function SectionHeaderBrand({ label, hideWordmarkOnMobile }: SectionHeaderBrandProps) {
  const dividerSpaceRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const dividerSpace = dividerSpaceRef.current;
    const brand = dividerSpace?.closest("a");
    const header = brand?.closest("header");
    if (!dividerSpace || !brand || !header) return;

    const updateMenuWidth = () => {
      const { left, width } = dividerSpace.getBoundingClientRect();
      if (width === 0) return;

      const dividerCenter = left + width / 2;
      header.style.setProperty(
        "--section-menu-width",
        `${dividerCenter - brand.getBoundingClientRect().left}px`,
      );
    };

    updateMenuWidth();
    const observer = new ResizeObserver(updateMenuWidth);
    observer.observe(dividerSpace);
    return () => observer.disconnect();
  }, []);

  return (
    <Link
      href={ROUTES.home}
      className="flex shrink-0 items-center text-lg font-semibold text-brand-700"
    >
      <span className="flex items-center lg:w-section-content">
        <span className="flex shrink-0 items-center gap-2">
          <Image src="/logo.png" alt="" width={44} height={44} priority />
          <span className={cn(hideWordmarkOnMobile && "sr-only sm:not-sr-only")}>VetCare</span>
        </span>
        <span
          ref={dividerSpaceRef}
          aria-hidden="true"
          className="hidden w-[calc(1rem+1px)] shrink-0 justify-center sm:flex lg:w-auto lg:flex-1"
        >
          <span className="h-5 w-px bg-line" />
        </span>
      </span>
      <span className="hidden text-sm font-medium text-muted sm:inline">{label}</span>
    </Link>
  );
}
