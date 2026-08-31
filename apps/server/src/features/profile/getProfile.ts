import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/httpError';

export const getProfileHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  // 1. Who is asking? (Extracted from the JWT by our requireUser middleware)
  const userId = res.locals.user.userId;

  // 2. Ask the database for their specific profile
  const profile = await prisma.prospectProfile.findUnique({
    where: { userId },
    // Bonus: Prisma lets us grab their email from the User table at the exact same time!
    include: {
      user: {
        select: { email: true, role: true }
      },
      documents: true,
    }
  });

  // 3. What if they haven't created one yet?
  if (!profile) {
    throw new HttpError(404, 'Profile not found. Please create one first.');
  }

  // 4. Hand them their data
  res.status(200).json({ profile });
};
