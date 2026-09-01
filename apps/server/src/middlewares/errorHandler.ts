import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/httpError';

/**
 * Terminal error handler — the single place in the app that writes an error
 * response. Handlers and middleware signal failure by throwing (or calling
 * `next(err)`); nothing else touches `res` on the error path. Must be
 * registered last.
 *
 * Turns known errors into JSON 4xx responses and everything else into a logged
 * 500, so a thrown error never leaks a stack trace or an HTML error page.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  // The response has already started streaming — nothing safe to add. Hand it
  // to Express's default handler, which closes the connection.
  if (res.headersSent) {
    next(err);
    return;
  }

  // Deliberate, handler-controlled failures (404s, 403s, conflicts, ...).
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Body/params/query that failed Zod validation.
  if (err instanceof ZodError) {
    res.status(400).json({ errors: err.issues });
    return;
  }

  // Prisma errors that map cleanly onto an HTTP status.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Resource not found' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A record with these details already exists' });
      return;
    }
  }

  // Errors that already carry an HTTP status — most notably body-parser's
  // malformed-JSON error (`entity.parse.failed`, status 400). Without this they
  // fall through to a misleading 500.
  const carriedStatus = httpStatusOf(err);
  if (carriedStatus) {
    const isParseFailure =
      typeof err === 'object' && err !== null && (err as { type?: unknown }).type === 'entity.parse.failed';
    res
      .status(carriedStatus)
      .json({ error: isParseFailure ? 'Malformed JSON in request body' : 'Bad request' });
    return;
  }

  // Log a curated shape, not the raw error — some errors carry request data
  // (e.g. body-parser attaches the raw body) that shouldn't land in logs.
  console.error('Unhandled error', {
    name: err instanceof Error ? err.name : typeof err,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  res.status(500).json({ error: 'Internal server error' });
};

/** A 4xx `status`/`statusCode` hung on an error by libraries like body-parser. */
function httpStatusOf(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const candidate = err as { status?: unknown; statusCode?: unknown };
  const code =
    typeof candidate.status === 'number'
      ? candidate.status
      : typeof candidate.statusCode === 'number'
        ? candidate.statusCode
        : undefined;
  return code !== undefined && code >= 400 && code < 500 ? code : undefined;
}
