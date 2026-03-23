import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AddDocumentInput } from './profile.schema';

export const addDocumentHandler = async (
  req: Request<{}, {}, AddDocumentInput>,
  res: Response
): Promise<void> => {
  try {
    const userId = res.locals.user.userId;
    const { url, type } = req.body;

    const profile = await prisma.prospectProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      res.status(404).json({ error: 'Profile not found. Please create one first.' });
      return;
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
  } catch (error) {
    console.error('Add document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
