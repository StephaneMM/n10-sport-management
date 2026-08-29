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
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .refine(
      (value) => !FORBIDDEN_JWT_SECRETS.has(value),
      'JWT_SECRET is a known placeholder value — generate a real secret (e.g. `openssl rand -base64 48`)',
    ),

  // Cloudflare R2 (S3-compatible) — where uploaded documents are stored.
  // Optional at boot so dev/CI run without credentials; storage.service throws
  // a clear error if an upload/download is attempted while any are missing.
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().min(1).optional(),
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
