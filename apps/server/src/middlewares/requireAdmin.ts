import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { HttpError } from '../lib/httpError';

/**
 * Gate for admin-only routes. Must run *after* `requireUser`, which loads the
 * caller's current role from the database into `res.locals.user`. Centralising
 * the check here means a new admin route can't silently ship without it.
 */
export function requireAdmin(_req: Request, res: Response, next: NextFunction): void {
  if (res.locals.user?.role !== Role.ADMIN) {
    throw new HttpError(403, 'Forbidden: admin access required');
  }
  next();
}
