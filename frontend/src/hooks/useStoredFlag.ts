import { useCallback, useState } from "react";

/** A true/false choice kept on the device. Blocked storage keeps the default. */
export function useStoredFlag(key: string, fallback: boolean): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved === null ? fallback : saved === "1";
    } catch {
      return fallback;
    }
  });
  const set = useCallback((next: boolean) => {
    setValue(next);
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {
      // the choice then lasts until the page is reloaded
    }
  }, [key]);
  return [value, set];
}
