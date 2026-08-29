import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { deleteObject } from '../../lib/storage.service';
import { DocumentIdParam } from './profile.schema';

export const deleteDocumentHandler = async (
  req: Request<DocumentIdParam>,
  res: Response
): Promise<void> => {
  try {
    const userId = res.locals.user.userId;
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id },
      include: { prospectProfile: { select: { userId: true } } },
    });

    if (!document || document.prospectProfile.userId !== userId) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    // Remove the bytes first; only drop the row if that succeeded, so we never
    // leave a dangling reference to a deleted object.
    await deleteObject(document.fileKey);
    await prisma.document.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
