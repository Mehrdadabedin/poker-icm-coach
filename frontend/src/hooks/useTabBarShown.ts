import { useLocation } from "react-router-dom";
import { useIsPhone } from "./useIsPhone";
import { useSignedIn } from "../services/authEvents";

// the table needs the whole screen (plan 101); the others are not signed-in pages
const HIDDEN = [/^\/table\//, /^\/auth\/callback/, /^\/change-password/];

/** Whether the phone tab bar is on screen (plan 099). */
export function useTabBarShown(): boolean {
  const { pathname } = useLocation();
  const phone = useIsPhone();
  const signedIn = useSignedIn();
  return phone && signedIn && !HIDDEN.some((hidden) => hidden.test(pathname));
}
