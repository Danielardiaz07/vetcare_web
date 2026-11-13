import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

type SectionHeadingProps = {
  id: string;
  title: string;
  children?: ReactNode;
  className?: string;
};

// D-45: títulos de sección que crecen con la pantalla (30 a 42 px) e introducción a 18 px.
export function SectionHeading({ id, title, children, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex max-w-3xl flex-col items-start gap-3.5", className)}>
      <h2
        id={id}
        className="text-[clamp(1.875rem,3.4vw,2.625rem)] leading-[1.08] font-semibold tracking-[-0.025em] text-ink"
      >
        {title}
      </h2>
      {children && <p className="max-w-[60ch] text-lg leading-relaxed text-muted">{children}</p>}
    </div>
  );
}
