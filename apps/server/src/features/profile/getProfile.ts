import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export const getProfileHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // 1. Who is asking? (Extracted from the JWT by our requireUser middleware)
    const userId = res.locals.user.userId;

    // 2. Ask the database for their specific profile
    const profile = await prisma.prospectProfile.findUnique({
      where: { userId },
      // Bonus: Prisma lets us grab their email from the User table at the exact same time!
      include: {
        user: {
          select: { email: true, role: true }
        }
      }
    });

    // 3. What if they haven't created one yet?
    if (!profile) {
      res.status(404).json({ error: 'Profile not found. Please create one first.' });
      return;
    }

    // 4. Hand them their data
    res.status(200).json({ profile });
    
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};