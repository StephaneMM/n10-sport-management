import { Response } from 'express';
import bcrypt from 'bcrypt';
import { ValidatedRequest } from '../../types/express';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/httpError';
import { signToken } from '../../lib/jwt';
import { BCRYPT_COST, hashPassword, needsRehash, verifyPassword } from '../../lib/password';
import { LoginInput } from './auth.schema';

// A valid bcrypt hash of a throwaway string, at the current cost. When the email
// is unknown we still run the comparison against this, so a failed login takes
// the same time whether or not the account exists — no timing enumeration. The
// precomputed cost-12 value avoids a startup hash in production; the test cost
// is cheap, so compute it there.
const DECOY_HASH =
  BCRYPT_COST >= 12
    ? '$2b$12$aiwyZwG63/ZIOpiC82ZvxeU0TGo3Sf2JfhPopx./RMNyncwxWyv32'
    : bcrypt.hashSync('n10-timing-attack-decoy', BCRYPT_COST);

export const loginHandler = async (
  req: ValidatedRequest<LoginInput>,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always do the bcrypt work, real hash or decoy. Same 401 for a wrong email
  // and a wrong password so neither the message nor the timing leaks which
  // emails are registered.
  const passwordMatches = await verifyPassword(password, user?.password ?? DECOY_HASH);
  if (!user || !passwordMatches) {
    throw new HttpError(401, 'Invalid email and/or password');
  }

  // We now hold the plaintext and know it's correct — transparently upgrade a
  // hash that predates the current cost. A failure here must not fail the login.
  if (needsRehash(user.password)) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(password) },
      });
    } catch (error) {
      console.error('Password rehash failed for user', user.id, error);
    }
  }

  // Short-lived (1 day) to bound the damage of a leaked token — there is no
  // revocation list yet. A refresh-token flow is the longer-term fix.
  const token = signToken({ userId: user.id, role: user.role });

  res.status(200).json({
    message: 'Login successful',
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
};
