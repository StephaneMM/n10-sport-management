import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { LoginInput } from './auth.schema';

// In production, this MUST come from your .env file!
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-local-dev-key';

export const loginHandler = async (
  req: Request<{}, {}, LoginInput>,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Find the user by email
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Note: We use the exact same error message for both wrong email and wrong password
    // This prevents hackers from guessing which emails exist in our system!
    if (!user) {
      res.status(401).json({ error: 'Invalid email and/or password' });
      return;
    }

    // 2. Check the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Invalid email and/or password' });
      return;
    }

    // 3. Mint the VIP Pass (JWT)
    const token = jwt.sign(
      { userId: user.id, role: user.role }, // The data hidden inside the token
      JWT_SECRET,                           // The signature proving WE made it
      { expiresIn: '7d' }                   // The pass expires in 7 days
    );

    // 4. Welcome back!
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, email: user.email, role: user.role }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};