import { useEffect, useState } from "react";

/** A value that shows for a few seconds after it arrives, then goes. */
export function useFlash<T>(value: T | null, ms: number): T | null {
  const [shown, setShown] = useState<T | null>(null);
  useEffect(() => {
    setShown(value);
    if (value === null) return undefined;
    const timer = setTimeout(() => setShown(null), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return shown;
}
