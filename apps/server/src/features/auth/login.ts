import { Response } from 'express';
import { ValidatedRequest } from '../../types/express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { env } from '../../config/env';
import { HttpError } from '../../lib/httpError';
import { LoginInput } from './auth.schema';

export const loginHandler = async (
  req: ValidatedRequest<LoginInput>,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  // 1. Find the user by email
  const user = await prisma.user.findUnique({ where: { email } });

  // Note: the exact same error for a wrong email and a wrong password, so an
  // attacker cannot tell which emails exist in our system.
  if (!user) {
    throw new HttpError(401, 'Invalid email and/or password');
  }

  // 2. Check the password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new HttpError(401, 'Invalid email and/or password');
  }

  // 3. Mint the VIP Pass (JWT)
  const token = jwt.sign(
    { userId: user.id, role: user.role }, // The data hidden inside the token
    env.JWT_SECRET,                        // The signature proving WE made it
    { expiresIn: '7d' }                   // The pass expires in 7 days
  );

  // 4. Welcome back!
  res.status(200).json({
    message: 'Login successful',
    token,
    user: { id: user.id, email: user.email, role: user.role }
  });
};
