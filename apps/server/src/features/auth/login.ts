import { Response } from 'express';
import { ValidatedRequest } from '../../types/express';
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/httpError';
import { signToken } from '../../lib/jwt';
import { LoginInput } from './auth.schema';

// A valid bcrypt hash of a throwaway string. When the email is unknown we still
// run bcrypt.compare against this, so a failed login takes the same time whether
// or not the account exists — an attacker can't enumerate emails by timing.
const DECOY_HASH = '$2b$10$PUo9.gJtvyEcYtSiq7IVs.2noVy543NTTHcvDlPwf6n.aprW.Hfqa';

export const loginHandler = async (
  req: ValidatedRequest<LoginInput>,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always do the bcrypt work, real hash or decoy. Same 401 for a wrong email
  // and a wrong password so neither the message nor the timing leaks which
  // emails are registered.
  const passwordMatches = await bcrypt.compare(password, user?.password ?? DECOY_HASH);
  if (!user || !passwordMatches) {
    throw new HttpError(401, 'Invalid email and/or password');
  }

  // Short-lived (1 day) to bound the damage of a leaked token — there is no
  // revocation list yet. A refresh-token flow is the longer-term fix.
  const token = signToken({ userId: user.id, role: user.role });

  // Welcome back!
  res.status(200).json({
    message: 'Login successful',
    token,
    user: { id: user.id, email: user.email, role: user.role }
  });
};
