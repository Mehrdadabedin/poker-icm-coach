import { useCallback, useEffect, useRef, useState } from "react";

/** Client-side auto-next countdown for the compact hand result (A10/A11).
 * Suspended while the player reviews; never touches the server clock. */
export function useAutoNext(next: () => void, seconds = 30) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextRef = useRef(next);
  nextRef.current = next;

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCountdown(null);
    setPaused(false);
  }, []);

  const start = useCallback(
    (from = seconds) => {
      if (timerRef.current) clearInterval(timerRef.current);
      let remaining = from;
      setCountdown(remaining);
      setPaused(false);
      timerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setCountdown(null);
          nextRef.current();
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    },
    [seconds],
  );

  const pause = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    start(countdown ?? seconds);
  }, [countdown, seconds, start]);

  useEffect(() => stop, [stop]);

  return { countdown, paused, start, stop, pause, resume };
}
