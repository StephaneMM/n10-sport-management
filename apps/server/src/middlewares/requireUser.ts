import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

/** Shape attached to `res.locals.user` for every authenticated request. */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
}

interface TokenPayload {
  userId: string;
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
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  // 2. Extract just the token (removing the word "Bearer ")
  const token = authHeader.split(' ')[1];

  // 3. The math check: did WE sign this token, and is it still unexpired?
  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    return;
  }

  // 4. A valid token is not enough. It lives for 7 days, during which the
  // account may have been deleted or had its role changed. Re-load the user on
  // every request and trust the database — never the token — for identity and
  // role.
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Account no longer exists' });
      return;
    }

    const authenticatedUser: AuthenticatedUser = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    res.locals.user = authenticatedUser;

    next();
  } catch (error) {
    console.error('requireUser error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
