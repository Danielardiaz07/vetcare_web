import type { ReactNode } from "react";

type SectionHeadingProps = {
  id: string;
  title: string;
  children?: ReactNode;
};

export function SectionHeading({ id, title, children }: SectionHeadingProps) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <h2 id={id} className="text-3xl font-semibold tracking-tight text-balance text-ink">
        {title}
      </h2>
      {children && <p className="text-pretty text-muted">{children}</p>}
    </div>
  );
}
