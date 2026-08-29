import { Response } from 'express';
import { ValidatedRequest } from '../../types/express';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { RegisterInput } from './auth.schema';

export const registerHandler = async (
  req: ValidatedRequest<RegisterInput>,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

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
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
