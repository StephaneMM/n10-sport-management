import { Response } from 'express';
import { ValidatedRequest } from '../../types/express';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/httpError';
import { UpdateProfileInput } from './profile.schema';

export const updateProfileHandler = async (
  req: ValidatedRequest<UpdateProfileInput>,
  res: Response
): Promise<void> => {
  const userId = res.locals.user.userId;
  const updateData = req.body;

  // 1. First, make sure they actually have a profile to update!
  const existingProfile = await prisma.prospectProfile.findUnique({
    where: { userId },
  });

  if (!existingProfile) {
    throw new HttpError(404, 'Profile not found. Please create one first.');
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
};
