import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

/**
 * Terminal error handler. Turns known request errors into JSON 4xx responses and
 * everything else into a logged 500 — so a thrown error never leaks a stack
 * trace or an HTML error page to the client. Must be registered last.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (res.headersSent) return;

  if (err instanceof ZodError) {
    res.status(400).json({ errors: err.issues });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
};
