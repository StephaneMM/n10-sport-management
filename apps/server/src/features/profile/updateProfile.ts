import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { UpdateProfileInput } from './profile.schema';

export const updateProfileHandler = async (
  req: Request<{}, {}, UpdateProfileInput>,
  res: Response
): Promise<void> => {
  try {
    const userId = res.locals.user.userId;
    const updateData = req.body;

    // 1. First, make sure they actually have a profile to update!
    const existingProfile = await prisma.prospectProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      res.status(404).json({ error: 'Profile not found. Please create one first.' });
      return;
    }

    // 2. Tell Prisma to update ONLY the fields they sent us
    const updatedProfile = await prisma.prospectProfile.update({
      where: { userId },
      data: updateData,
    });

    // 3. Return the freshly updated profile
    res.status(200).json({
      message: 'Profile updated successfully',
      profile: updatedProfile,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};