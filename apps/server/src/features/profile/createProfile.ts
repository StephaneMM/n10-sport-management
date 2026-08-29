import { Response } from 'express';
import { ValidatedRequest } from '../../types/express';
import { prisma } from '../../lib/prisma';
import { CreateProfileInput } from './profile.schema';

export const createProfileHandler = async (
  req: ValidatedRequest<CreateProfileInput>,
  res: Response
): Promise<void> => {
  try {
    // 1. Who is asking? (Our JWT Bouncer attached this to res.locals!)
    const userId = res.locals.user.userId;

    // 2. What are they sending? (Our Zod Bouncer already checked this!)
    const profileData = req.body;

    // 3. Rule Check: A user can only have ONE profile
    const existingProfile = await prisma.prospectProfile.findUnique({
      where: { userId },
    });

    if (existingProfile) {
      res.status(409).json({ error: 'Profile already exists for this user' });
      return;
    }

    // 4. Save the athlete to the database!
    const newProfile = await prisma.prospectProfile.create({
      data: {
        userId, // We force the profile to link to the logged-in user
        ...profileData, // Spread the rest of the validated sports data
      },
    });

    // 5. Success!
    res.status(201).json({
      message: 'Prospect profile created successfully',
      profile: newProfile,
    });
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};