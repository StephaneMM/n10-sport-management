import { Response } from 'express';
import { ValidatedRequest } from '../../types/express';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/httpError';
import { hashPassword } from '../../lib/password';
import { RegisterInput } from './auth.schema';

export const registerHandler = async (
  req: ValidatedRequest<RegisterInput>,
  res: Response
): Promise<void> => {
  const { email, password } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new HttpError(409, 'Email already in use');
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      // Public sign-up ALWAYS creates a PROSPECT. Elevated roles are never
      // taken from client input — they are granted by the seed script or a
      // future admin-only endpoint.
      role: Role.PROSPECT,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
    }
  });

  res.status(201).json({ message: 'User created successfully', user: newUser });
};
