import { useEffect, useRef } from "react";
import { inAndroidApp } from "../services/platform";

/** Escape and the Android back button close an open sheet or drawer. A tap outside is the scrim's own click. */
export function useDismiss(open: boolean, onClose: () => void): void {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close.current(); };
    document.addEventListener("keydown", onKey);
    let stopped = false;
    let remove: (() => Promise<void>) | undefined;
    if (inAndroidApp()) {
      void import("@capacitor/app").then(async ({ App }) => {
        const handle = await App.addListener("backButton", () => close.current());
        if (stopped) return handle.remove();
        remove = () => handle.remove();
        return undefined;
      });
    }
    return () => {
      stopped = true;
      document.removeEventListener("keydown", onKey);
      void remove?.();
    };
  }, [open]);
}
