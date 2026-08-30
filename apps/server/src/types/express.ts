import type { Request } from 'express';
import type { AuthenticatedUser } from '../middlewares/requireUser';

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

// `requireUser` attaches the authenticated user here; type it so handlers get
// `string` (not `any`) for `res.locals.user.userId`.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      user: AuthenticatedUser;
    }
  }
}
