import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { HttpError } from '../lib/httpError';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
}

/**
 * Rejects a request unless it carries a valid Cloudflare Turnstile token,
 * proving a human (not a script) submitted the form.
 *
 * A no-op when TURNSTILE_SECRET_KEY is unset, so local development and the test
 * suite run without a Cloudflare account.
 */
export async function verifyTurnstile(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    next();
    return;
  }

  const token = (req.body as { turnstileToken?: unknown }).turnstileToken;
  if (typeof token !== 'string' || token.length === 0) {
    throw new HttpError(403, 'Bot check failed. Please retry.');
  }

  const params = new URLSearchParams({ secret, response: token });
  if (req.ip) params.set('remoteip', req.ip);

  let outcome: SiteverifyResponse;
  try {
    const response = await fetch(SITEVERIFY_URL, { method: 'POST', body: params });
    outcome = (await response.json()) as SiteverifyResponse;
  } catch {
    // Cloudflare unreachable — fail closed rather than wave the request through.
    throw new HttpError(503, 'Bot check is temporarily unavailable. Please retry.');
  }

  if (!outcome.success) {
    throw new HttpError(403, 'Bot check failed. Please retry.');
  }

  next();
}
