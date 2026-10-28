import { useEffect, useState } from "react";
import { inAndroidApp } from "../services/platform";

export const PHONE_MAX_WIDTH = 768;

/** The Android app, or a browser narrower than 768 px: where the tab bar replaces the card menu. */
export function useIsPhone(): boolean {
  const [narrow, setNarrow] = useState(() => window.innerWidth < PHONE_MAX_WIDTH);
  useEffect(() => {
    const read = () => setNarrow(window.innerWidth < PHONE_MAX_WIDTH);
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return narrow || inAndroidApp();
}
