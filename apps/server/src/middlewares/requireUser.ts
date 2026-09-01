import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { HttpError } from '../lib/httpError';
import { verifyToken } from '../lib/jwt';

/** Shape attached to `res.locals.user` for every authenticated request. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
}

export const requireUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // 1. Look for the Bouncer's VIP pass in the headers
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new HttpError(401, 'Unauthorized: No token provided');
  }

  // 2. Extract just the token (removing the word "Bearer ")
  const token = authHeader.split(' ')[1];

  // 3. The math check: did WE sign this token (right algorithm + issuer) and is
  // it still unexpired?
  let payload: { userId: string; role: Role };
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, 'Unauthorized: Invalid or expired token');
  }

  // 4. A valid token is not enough. It lives for 7 days, during which the
  // account may have been deleted or had its role changed. Re-load the user on
  // every request and trust the database — never the token — for identity and
  // role. A database failure here rejects the promise and Express routes it to
  // the errorHandler as a 500.
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new HttpError(401, 'Unauthorized: Account no longer exists');
  }

  const authenticatedUser: AuthenticatedUser = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  res.locals.user = authenticatedUser;

  next();
};
