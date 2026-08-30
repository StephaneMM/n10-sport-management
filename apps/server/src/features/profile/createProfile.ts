import { Response } from 'express';
import { Prisma } from '@prisma/client';
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

    // 4. Save the athlete. profileData is already validated by createProfileSchema,
    // so the cast is safe — it just sidesteps a Prisma XOR-type inference quirk.
    const newProfile = await prisma.prospectProfile.create({
      data: { ...profileData, userId } as Prisma.ProspectProfileUncheckedCreateInput,
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