import type { Request } from 'express';

/**
 * An Express Request whose body has already been validated and coerced by the
 * `validateResource` middleware. Optionally carries typed path params.
 *
 * Replaces the `Request<{}, {}, Body>` idiom, which trips
 * `@typescript-eslint/no-empty-object-type`.
 */
export type ValidatedRequest<Body, Params = Record<string, never>> = Request<
  Params,
  unknown,
  Body
>;
