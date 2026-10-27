import type { ReactNode } from "react";

/** Line icons for the home menu cards (24x24, stroke only), coloured by CSS. */
export const MENU_ICONS = {
  continue: <path d="M8 5l11 7-11 7z" />,
  start: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  coach: (
    <>
      <path d="M4 5h16v11h-9l-4 4v-4H4z" />
      <path d="M8.5 10.5l2.2 2.2 4.3-4.3" />
    </>
  ),
  ranges: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16" />
    </>
  ),
  calculator: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" />
    </>
  ),
  glossary: (
    <>
      <path d="M5 5a2 2 0 0 1 2-2h12v15H7a2 2 0 0 0-2 2z" />
      <path d="M5 20a2 2 0 0 0 2 2h12v-4" />
      <path d="M9 8h6M9 11.5h4" />
    </>
  ),
  mistakes: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20 20" />
      <path d="M10.5 8v3.2" />
      <path d="M10.5 13.6h.01" />
    </>
  ),
  history: (
    <>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4h4" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  report: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 17v-3M12 17V9M16 17v-6" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  portrait: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18.5c1.2-2.3 3.2-3.5 5.5-3.5s4.3 1.2 5.5 3.5" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type MenuIcon = keyof typeof MENU_ICONS;
