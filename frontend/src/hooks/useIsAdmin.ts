import { useEffect, useState } from "react";
import { adminSummary, getToken } from "../services/api";

/** The server's Admin check (403 for everyone else). It only decides what the
 * menu shows; the backend stays the boundary. */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);
  const token = getToken();
  useEffect(() => {
    if (!token) {
      setIsAdmin(false);
      return undefined;
    }
    let cancelled = false;
    adminSummary()
      .then(() => { if (!cancelled) setIsAdmin(true); })
      .catch(() => { if (!cancelled) setIsAdmin(false); });
    return () => { cancelled = true; };
  }, [token]);
  return isAdmin;
}
