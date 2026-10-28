import { useEffect, useState } from "react";
import { getToken } from "./api";
import { AUTH_EVENT } from "./authEvent";

export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(() => !!getToken());
  useEffect(() => {
    const read = () => setSignedIn(!!getToken());
    window.addEventListener(AUTH_EVENT, read);
    return () => window.removeEventListener(AUTH_EVENT, read);
  }, []);
  return signedIn;
}
