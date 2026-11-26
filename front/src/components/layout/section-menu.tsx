"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { cn } from "@/components/ui/cn";
import { Icon, type IconName } from "@/components/ui/icon";

type SectionItem = {
  href: string;
  label: string;
  shortLabel?: string;
  sidebarLabel?: string;
  icon: IconName;
  hideOnMobile?: boolean;
  primary?: boolean;
  upcoming?: number;
};

type SectionMenuProps = {
  label: string;
  items: SectionItem[];
  current: string | undefined;
};

export function SectionMenu({ label, items, current }: SectionMenuProps) {
  const pathname = usePathname();
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const dropdown = useRef<HTMLDivElement>(null);
  const railItems = items.filter((item) => !item.primary);
  const primaryAction = items.find((item) => item.primary);
  const mobileItems = items.filter((item) => !item.hideOnMobile);

  function closeMenu() {
    if (dropdown.current?.matches(":popover-open")) dropdown.current.hidePopover();
  }

  useEffect(closeMenu, [pathname]);

  useEffect(() => {
    window.addEventListener("resize", closeMenu);
    return () => window.removeEventListener("resize", closeMenu);
  }, []);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        popoverTarget={menuId}
        aria-controls={menuId}
        className="hidden min-h-11 shrink-0 items-center gap-2 rounded-control px-2 font-semibold text-brand-700 hover:bg-brand-50 md:inline-flex lg:hidden print:hidden"
      >
        <Icon name="menu" className="size-5" />
        Menú
      </button>
      <div
        ref={dropdown}
        id={menuId}
        popover="auto"
        onBeforeToggle={(event) => {
          if (event.newState !== "open") return;
          const anchor = trigger.current?.getBoundingClientRect();
          if (!anchor) return;
          event.currentTarget.style.top = `${anchor.bottom + 8}px`;
          event.currentTarget.style.right = `${document.documentElement.clientWidth - anchor.right}px`;
        }}
        className="fixed inset-auto m-0 w-56 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-chip border border-line bg-surface p-2 text-ink shadow-soft max-md:hidden lg:hidden print:hidden"
      >
        <nav aria-label={label}>
          <SectionLinks items={items} current={current} variant="dropdown" onNavigate={closeMenu} />
        </nav>
      </div>
      <aside className="absolute top-[calc(100%+1px+var(--spacing)*6)] left-6 hidden max-h-[calc(100dvh-7rem)] w-[var(--section-menu-width,8.5rem)] flex-col gap-4 overflow-y-auto lg:flex print:hidden">
        <nav
          aria-label={label}
          className="rounded-card border border-line bg-surface p-[var(--section-menu-padding)] [--section-menu-padding:0.375rem]"
        >
          <SectionLinks items={railItems} current={current} variant="rail" />
        </nav>
        {primaryAction && (
          <Link
            href={primaryAction.href}
            aria-current={primaryAction.href === current ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-white px-2 font-semibold text-white shadow-sm transition-colors duration-150 ease-out hover:bg-brand-700 focus-visible:outline-offset-[-4px] focus-visible:outline-white",
              primaryAction.href === current ? "bg-brand-700" : "bg-brand-600",
            )}
          >
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-control bg-surface text-brand-600">
              <Icon name={primaryAction.icon} className="size-4" />
            </span>
            <span>{primaryAction.label}</span>
          </Link>
        )}
      </aside>
      <nav
        aria-label={label}
        className="fixed inset-x-0 bottom-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        <SectionLinks items={mobileItems} current={current} variant="mobile" />
      </nav>
    </>
  );
}

const linkStyles = {
  dropdown: "flex min-h-11 items-center gap-3 rounded-control px-3",
  rail: "isolate flex min-h-11 items-center gap-1.5 rounded-[calc(var(--radius-card)-var(--section-menu-padding)-3px)] pl-2 text-sm leading-tight before:pointer-events-none before:absolute before:inset-[2px] before:-z-10 before:rounded-[inherit]",
  mobile:
    "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1 text-center text-xs",
};

function SectionLinks({
  items,
  current,
  variant,
  onNavigate,
}: {
  items: SectionItem[];
  current: string | undefined;
  variant: keyof typeof linkStyles;
  onNavigate?: () => void;
}) {
  const isMobile = variant === "mobile";
  const isRail = variant === "rail";

  return (
    <ul
      className={isMobile ? "grid" : "flex flex-col gap-1"}
      style={
        isMobile ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` } : undefined
      }
    >
      {items.map(({ href, label, shortLabel, sidebarLabel, icon, primary, upcoming }) => {
        const active = href === current;
        const visibleLabel = isRail
          ? (sidebarLabel ?? shortLabel ?? label)
          : isMobile
            ? (shortLabel ?? label)
            : label;

        return (
          <li key={href} className="min-w-0">
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              onNavigate={onNavigate}
              className={cn(
                linkStyles[variant],
                "relative font-medium transition-colors duration-150 ease-out",
                primary && !isMobile
                  ? cn(
                      "font-semibold text-white hover:bg-brand-700",
                      active ? "bg-brand-700" : "bg-brand-600",
                    )
                  : cn(
                      isRail ? "hover:before:bg-brand-50" : "hover:bg-brand-50",
                      active && (isRail ? "before:bg-brand-50" : "bg-brand-50"),
                      active ? "font-semibold text-brand-700" : "text-muted hover:text-brand-700",
                    ),
                !isMobile && "focus-visible:outline-offset-[-2px]",
              )}
            >
              <Icon name={icon} className={cn("shrink-0", isRail ? "size-4" : "size-5")} />
              <span className={visibleLabel === label ? undefined : "sr-only"}>{label}</span>
              {visibleLabel !== label && <span aria-hidden="true">{visibleLabel}</span>}
              {!!upcoming && (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "min-w-5 rounded-full bg-brand-600 px-1 text-center text-xs font-semibold text-white",
                      isMobile ? "absolute top-0.5 left-1/2 ml-2 leading-4" : "ml-auto leading-5",
                      isRail && "mr-1",
                    )}
                  >
                    {upcoming > 99 ? "99+" : upcoming}
                  </span>
                  <span className="sr-only">
                    , {upcoming === 1 ? "1 próxima" : `${upcoming} próximas`}
                  </span>
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
