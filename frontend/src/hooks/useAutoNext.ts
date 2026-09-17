import { useCallback, useEffect, useRef, useState } from "react";

/** Client-side auto-next countdown for the compact hand result (A10/A11).
 * Suspended while the player reviews; never touches the server clock. */
export function useAutoNext(next: () => void, seconds = 30) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextRef = useRef(next);
  nextRef.current = next;

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    clearTimer();
    setCountdown(null);
    setPaused(false);
  }, []);

  const start = useCallback(
    (from = seconds) => {
      clearTimer();
      let remaining = from;
      setCountdown(remaining);
      setPaused(false);
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining); // renders 9..1..0
        if (remaining === 0) {
          // hold "0" for one full second (do not fire yet)
          return;
        }
        if (remaining < 0) {
          // "0" was shown; now trigger the next hand
          clearTimer();
          nextRef.current();
        }
      }, 1000);
    },
    [seconds],
  );

  const pause = useCallback(() => {
    clearTimer();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    start(countdown ?? seconds);
  }, [countdown, seconds, start]);

  useEffect(() => stop, [stop]);

  return { countdown, paused, start, stop, pause, resume };
}
