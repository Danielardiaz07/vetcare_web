import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "home"
  | "calendar"
  | "calendar-plus"
  | "file-medical"
  | "receipt"
  | "user"
  | "paw"
  | "download"
  | "close"
  | "chevron-right"
  | "alert"
  | "eye"
  | "eye-off"
  | "users"
  | "clock"
  | "menu"
  | "phone"
  | "map-pin"
  | "message"
  | "stethoscope"
  | "syringe"
  | "clipboard-check"
  | "scissors"
  | "scalpel"
  | "flask"
  | "shield"
  | "arrow-right"
  | "log-in";

const ICON_SIZE = 24;

const PATHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M10 21v-6h4v6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  "calendar-plus": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
    </>
  ),
  "file-medical": (
    <>
      <path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z" />
      <path d="M14 3v5h5M12 11v6M9 14h6" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  paw: (
    <>
      <circle cx="7" cy="9" r="2" />
      <circle cx="17" cy="9" r="2" />
      <circle cx="10" cy="5" r="2" />
      <circle cx="14" cy="5" r="2" />
      <path d="M12 12c-3 0-6 3.5-6 6 0 1.7 1.3 3 3 3 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.7 0 3-1.3 3-3 0-2.5-3-6-6-6z" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M4 17v3h16v-3" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  alert: (
    <>
      <path d="M12 3 2 20h20z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  "eye-off": (
    <>
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.6 3.5M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  phone: (
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  ),
  "map-pin": (
    <>
      <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  message: <path d="M4 5h16v11H9l-5 4z" />,
  stethoscope: (
    <>
      <path d="M6 3v6a4 4 0 0 0 8 0V3" />
      <path d="M10 13v2a5 5 0 0 0 10 0v-2" />
      <circle cx="20" cy="11" r="2" />
    </>
  ),
  syringe: (
    <>
      <path d="m18 2 4 4M17 7l-9.5 9.5-3-3L14 4M15 9l-2-2M12 12l-2-2" />
      <path d="M4.5 13.5 2 22l8.5-2.5" />
    </>
  ),
  "clipboard-check": (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 13l2 2 4-4" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.1 8.1 20 20M8.1 15.9 20 4" />
    </>
  ),
  scalpel: <path d="M3 21 15 9l3 3-6 6zM15 9l4-6 2 2-3 7" />,
  flask: (
    <>
      <path d="M9 3h6M10 3v6L4.5 19A1.5 1.5 0 0 0 5.8 21h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3" />
      <path d="M7 15h10" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  "log-in": (
    <>
      <path d="M14 4h5v16h-5" />
      <path d="M3 12h11M10 8l4 4-4 4" />
    </>
  ),
};

type IconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
};

export function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      width={ICON_SIZE}
      height={ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}
