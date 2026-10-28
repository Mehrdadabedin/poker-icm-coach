/* A request the server refused with 402 pro_required. No imports, so api.ts can use it. */
export const PRO_EVENT = "icm-pro-required";

export class ProRequiredError extends Error {
  constructor() {
    super("Pro required (API 402)");
    this.name = "ProRequiredError";
  }
}

export const announceProRequired = (): void => {
  window.dispatchEvent(new Event(PRO_EVENT));
};
