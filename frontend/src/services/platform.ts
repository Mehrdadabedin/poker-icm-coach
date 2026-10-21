/* Is this page running inside the ICMBOT Android app (plan 085)? The app
 * adds "ICMBOTApp" to its user agent; an app built before that is still
 * known by the Capacitor bridge it injects into the page. */

type CapacitorGlobal = { isNativePlatform?: () => boolean };

export const APP_USER_AGENT = "ICMBOTApp";

export function inAndroidApp(): boolean {
  if (typeof navigator !== "undefined" && navigator.userAgent.includes(APP_USER_AGENT)) return true;
  const bridge = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  return bridge?.isNativePlatform?.() === true;
}

/** A phone or tablet browser, where a file input with `capture` opens the camera. */
export function hasTouchScreen(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}
