import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { HttpError } from '../lib/httpError';
import { reportAutoFixIssue } from '../lib/autofix/createIssue';

/**
 * Terminal error handler — the single place in the app that writes an error
 * response. Handlers and middleware signal failure by throwing (or calling
 * `next(err)`); nothing else touches `res` on the error path. Must be
 * registered last.
 *
 * Turns known errors into JSON 4xx responses and everything else into a logged
 * 500, so a thrown error never leaks a stack trace or an HTML error page.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
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
    if (isPublicLeadSubmission(req)) {
      console.warn('Lead API validation failed', {
        requestId: requestId(req),
        issues: err.issues.map((issue) => ({
          path: issue.path.map(String).join('.'),
          code: issue.code,
        })),
        inputShape: describeLeadInput(req.body),
      });
    }
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
    if (isPublicLeadSubmission(req)) {
      console.warn('Lead API request rejected before validation', {
        requestId: requestId(req),
        status: carriedStatus,
        reason: isParseFailure ? 'malformed_json' : 'request_body_error',
        contentLength: req.get('content-length'),
        contentType: req.get('content-type'),
      });
    }
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

  // Report to GitHub as a crash-report issue if configured. Sentry's error
  // handler (registered earlier) stores its event id on `res.sentry`.
  void reportAutoFixIssue({ err, req, sentryEventId: (res as { sentry?: string }).sentry }).catch(
    (reportErr) => {
      console.error('[autofix] Failed to report crash to GitHub:', reportErr);
    },
  );

  res.status(500).json({ error: 'Internal server error' });
};

const LEAD_INPUT_FIELDS = new Set([
  'firstName', 'lastName', 'email', 'phone', 'country', 'dateOfBirth', 'nationality',
  'gender', 'sport', 'positions', 'heightCm', 'weightKg', 'verticalJumpCm', 'league',
  'currentClub', 'highlightLinks', 'messageToUs', 'source', 'preferredLanguage',
  'consentToContact', 'guardianName', 'guardianEmail', 'guardianPhone', 'guardianRelationship',
]);

function isPublicLeadSubmission(req: Parameters<ErrorRequestHandler>[1]): boolean {
  return req.method === 'POST' && req.path.replace(/\/+$/, '') === '/api/leads';
}

function requestId(req: Parameters<ErrorRequestHandler>[1]): string | undefined {
  return req.get('x-vercel-id') ?? req.get('x-request-id');
}

/** Describe types and lengths only; never log applicant-provided values. */
function describeLeadInput(input: unknown): Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return {};

  const shape: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(input)) {
    if (field === 'turnstileToken') {
      shape.turnstileTokenPresent = typeof value === 'string' && value.length > 0;
      continue;
    }
    if (!LEAD_INPUT_FIELDS.has(field)) continue;

    if (typeof value === 'string') {
      shape[field] = { type: 'string', length: value.length };
    } else if (Array.isArray(value)) {
      shape[field] = {
        type: 'array',
        length: value.length,
        itemTypes: value.slice(0, 20).map((item) => typeof item),
        stringItemLengths: value.slice(0, 20).map((item) =>
          typeof item === 'string' ? item.length : undefined),
      };
    } else if (value === null) {
      shape[field] = { type: 'null' };
    } else if (typeof value === 'number') {
      shape[field] = { type: 'number', finite: Number.isFinite(value) };
    } else {
      shape[field] = { type: typeof value };
    }
  }
  return shape;
}

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
