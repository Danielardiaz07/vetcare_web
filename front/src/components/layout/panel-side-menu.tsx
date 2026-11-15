"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { Icon } from "@/components/ui/icon";
import { PANEL_MENU, panelItemFor, type StaffRole } from "@/lib/panel-menu";

type PanelSideMenuProps = {
  role: StaffRole;
};

export function PanelSideMenu({ role }: PanelSideMenuProps) {
  const pathname = usePathname();
  const items = PANEL_MENU[role];
  const current = panelItemFor(role, pathname)?.href;

  return (
    <>
      <aside className="hidden w-60 shrink-0 self-start rounded-card border border-line bg-surface p-3 md:sticky md:top-24 md:block">
        <nav aria-label="Panel">
          <ul className="flex flex-col gap-1">
            {items.map(({ href, label, icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={href === current ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-control px-3 transition-colors duration-150 ease-out",
                    href === current
                      ? "bg-brand-50 font-semibold text-brand-700"
                      : "font-medium text-muted hover:bg-brand-50 hover:text-brand-700",
                  )}
                >
                  <Icon name={icon} className="size-5" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <nav
        aria-label="Panel"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul
          className="grid"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map(({ href, label, icon }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={href === current ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-center text-xs font-medium",
                  href === current ? "text-brand-700" : "text-muted",
                )}
              >
                <Icon name={icon} className="size-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
