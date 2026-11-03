/* A 429 from the backend (plan 109), as an error the screens can word themselves. */
export class RateLimitError extends Error {
  constructor(readonly retryAfterSeconds: number) {
    super("too_many_requests");
    this.name = "RateLimitError";
  }
}

/** fetch, except a 429 throws RateLimitError with the server's wait. */
export async function limitedFetch(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (response.status === 429) {
    const seconds = Number(response.headers.get("Retry-After"));
    throw new RateLimitError(seconds > 0 ? seconds : 60);
  }
  return response;
}

export const minutesToWait = (error: RateLimitError): number =>
  Math.ceil(error.retryAfterSeconds / 60);
