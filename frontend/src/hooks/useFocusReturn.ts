import { useEffect, type RefObject } from "react";

const CONTROLS = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]";

/** A panel that opens takes the focus to its first control, and gives it back
 * to what had it (the button that opened it) when it closes, so a keyboard or
 * screen-reader player is not left on the page behind it (plan 111). */
export function useFocusReturn(open: boolean, box: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
      ? document.activeElement : null;
    // tabIndex -1 skips the tabs that arrow keys reach, so the chosen tab gets the focus
    const first = [...(box.current?.querySelectorAll<HTMLElement>(CONTROLS) ?? [])].find((el) => el.tabIndex >= 0);
    // the glossary pop-up closes on scroll
    first?.focus({ preventScroll: true });
    return () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); };
  }, [open, box]);
}
