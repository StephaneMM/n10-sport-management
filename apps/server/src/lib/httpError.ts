/**
 * An error a request handler can throw to control the HTTP response.
 *
 * Handlers never call `res.status().json()` for failures — they `throw new
 * HttpError(status, message)` and let the terminal `errorHandler` turn it into
 * a JSON response. The `message` is sent verbatim to the client, so it must be
 * safe to expose (no internals, no user-supplied echoes that could mislead).
 */
export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
