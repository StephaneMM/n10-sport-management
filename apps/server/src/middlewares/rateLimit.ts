import { rateLimit, ipKeyGenerator, type Options } from 'express-rate-limit';

const MINUTE = 60 * 1000;

/**
 * Base factory so every limiter in the app shares the same JSON error shape and
 * header behaviour. Callers must at least provide `limit` and `windowMs`.
 *
 * Keys on the client IP (via `ipKeyGenerator`, which groups an IPv6 address by
 * its /56 so a single client can't rotate through addresses). This only works
 * if Express `trust proxy` is set correctly — see config/env TRUST_PROXY.
 */
export function createRateLimiter(options: Partial<Options> & Pick<Options, 'limit' | 'windowMs'>) {
  return rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please slow down and try again later.' },
    keyGenerator: (req) => ipKeyGenerator(req.ip ?? ''),
    ...options,
  });
}

/**
 * Brute-force protection for the credential endpoints (`/auth/login`,
 * `/auth/register`). Successful requests are not counted, so a legitimate user
 * is never locked out by their own valid logins, while a password-guessing loop
 * — all failures — is throttled quickly.
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: 15,
  skipSuccessfulRequests: true,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' },
});

/**
 * Spam / write-flood protection for the unauthenticated public lead form.
 * Every request counts — there is no "good" reason for one IP to submit the
 * form many times an hour.
 */
export const publicLeadLimiter = createRateLimiter({
  windowMs: 60 * MINUTE,
  limit: 15,
  message: { error: 'Too many submissions from this network. Please try again later.' },
});

/**
 * Coarse ceiling on all of /api, so an authenticated caller (or a stolen token)
 * can't hammer the read endpoints without limit. Generous enough that normal
 * use never hits it; the stricter limiters above still guard the sensitive
 * routes.
 */
export const apiLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: 300,
});
