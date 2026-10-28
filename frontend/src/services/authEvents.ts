import { useEffect, useState } from "react";
import { getToken } from "./api";

const EVENT = "icm-auth";

/** The sign-in screen changes the session without changing the route, so the
 * tab bar listens for this instead of waiting for a navigation. */
export const announceAuth = (): void => {
  window.dispatchEvent(new Event(EVENT));
};

export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(() => !!getToken());
  useEffect(() => {
    const read = () => setSignedIn(!!getToken());
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);
  return signedIn;
}
