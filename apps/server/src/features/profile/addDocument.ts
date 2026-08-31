import { Response } from 'express';
import { ValidatedRequest } from '../../types/express';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/httpError';
import { AddDocumentInput } from './profile.schema';

export const addDocumentHandler = async (
  req: ValidatedRequest<AddDocumentInput>,
  res: Response
): Promise<void> => {
  const userId = res.locals.user.userId;
  const { url, type } = req.body;

  const profile = await prisma.prospectProfile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new HttpError(404, 'Profile not found. Please create one first.');
  }

  const document = await prisma.document.create({
    data: {
      url,
      type,
      prospectProfileId: profile.id, // The Relational Link!
    },
  });

  res.status(201).json({
    message: 'Document safely stored in the vault',
    document,
  });
};
