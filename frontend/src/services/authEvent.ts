/* The session changed (sign-in, sign-out or an expired token). No imports, so
 * api.ts can use it without a circular import with authEvents.ts. */
export const AUTH_EVENT = "icm-auth";

export const announceAuth = (): void => {
  window.dispatchEvent(new Event(AUTH_EVENT));
};
