import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { getObjectStream } from '../../lib/storage.service';
import { DocumentIdParam } from './profile.schema';

export const downloadDocumentHandler = async (
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

    // 404 (not 403) for someone else's document — don't confirm it exists.
    if (!document || document.prospectProfile.userId !== userId) {
      res.status(404).json({ error: 'Document not found.' });
      return;
    }

    const fileStream = await getObjectStream(document.fileKey);

    // fileName is sanitised at upload; strip again so a stored value can never
    // break out of the header quotes.
    const headerName = document.fileName.replace(/[^\w.\- ]+/g, '_');

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${headerName}"`);

    fileStream.on('error', (error) => {
      console.error('Document stream error:', error);
      if (!res.headersSent) res.status(502).json({ error: 'Failed to retrieve the file.' });
      else res.destroy(error);
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error('Download document error:', error);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  }
};
