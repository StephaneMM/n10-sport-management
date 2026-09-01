import 'dotenv/config';
import { z } from 'zod';

/**
 * Single source of truth for environment configuration.
 *
 * `process.env` is parsed exactly once, at startup. If anything required is
 * missing, too weak, or still set to a shipped placeholder, the process throws
 * before the server starts listening — a misconfigured deploy fails loudly
 * instead of running silently insecure.
 */

// Values that must never reach a running server: the old hard-coded dev
// fallback and the placeholders from env.example.
const FORBIDDEN_JWT_SECRETS = new Set([
  'super-secret-local-dev-key',
  'super_secret_key_change_in_production',
  'changeme',
  'secret',
]);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  // Number of reverse-proxy hops in front of the app (Render/Railway/Fly/Nginx
  // are usually 1). Controls Express `trust proxy` so req.ip — and therefore
  // rate limiting — sees the real client, not the proxy. 0 = trust nobody.

  TRUST_PROXY: z.coerce
    .number()
    .int()
    .min(0)
    .default(process.env.VERCEL ? 1 : 0),

  // Comma-separated list of browser origins allowed to call the API. Unset or
  // empty falls back to the local dev ports; set the deployed frontend URL(s)
  // in production.
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((value) => {
      const raw =
        value?.trim() || 'http://localhost:8080,http://localhost:5173,http://localhost:3000';
      return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
    }),

  // Public POST /api/auth/register. Off by default: it only creates PROSPECT
  // accounts, and until there is a prospect portal the endpoint is pure attack
  // surface (account spam, email enumeration). Set to the string "true" to mount
  // it when the portal ships.
  ENABLE_PUBLIC_REGISTRATION: z
    .string()
    .optional()
    .transform((value) => value === 'true'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .refine(
      (value) => !FORBIDDEN_JWT_SECRETS.has(value),
      'JWT_SECRET is a known placeholder value — generate a real secret (e.g. `openssl rand -base64 48`)',
    ),

  // Cloudflare Turnstile secret. When set, the public lead form must send a
  // valid Turnstile token. Unset (local dev, tests) disables the check.
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Pure parser — takes an env-like object, returns a validated config or throws
 * an Error listing every problem. Kept separate from the module singleton so it
 * can be unit-tested without touching the real `process.env`.
 */
export function parseEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.data;
}

export const env = parseEnv(process.env);
