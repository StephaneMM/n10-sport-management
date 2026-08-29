import { Response } from 'express';
import { ValidatedRequest } from '../../types/express';
import { prisma } from '../../lib/prisma';
import { putObject } from '../../lib/storage.service';
import { AddDocumentInput } from './profile.schema';

export const addDocumentHandler = async (
  req: ValidatedRequest<AddDocumentInput>,
  res: Response
): Promise<void> => {
  try {
    const userId = res.locals.user.userId;

    if (!req.file) {
      res.status(400).json({ error: 'No file was uploaded.' });
      return;
    }

    if (req.file.buffer.length === 0) {
      res.status(400).json({ error: 'The uploaded file is empty.' });
      return;
    }

    const profile = await prisma.prospectProfile.findUnique({ where: { userId } });
    if (!profile) {
      res.status(404).json({ error: 'Profile not found. Please create one first.' });
      return;
    }

    // Only reached once we know there is a profile to attach the file to.
    const { key, fileName } = await putObject(req.file);

    const document = await prisma.document.create({
      data: {
        fileKey: key,
        fileName,
        mimeType: req.file.mimetype,
        type: req.body.type,
        prospectProfileId: profile.id,
      },
    });

    res.status(201).json({ message: 'Document stored in the vault', document });
  } catch (error) {
    console.error('Add document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
