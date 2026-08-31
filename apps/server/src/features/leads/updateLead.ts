import { Response } from 'express';
import { ValidatedRequest } from '../../types/express';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/httpError';
import { UpdateLeadParams, UpdateLeadBody } from './lead.schema';

export const updateLeadHandler = async (
  req: ValidatedRequest<UpdateLeadBody, UpdateLeadParams>,
  res: Response
): Promise<void> => {
  // 1. The Admin Bouncer
  if (res.locals.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Forbidden: You must be an admin to update leads.');
  }

  const { id } = req.params;
  const { adminComment } = req.body;

  // 2. Update the record. If the id is unknown Prisma throws P2025, which the
  // errorHandler turns into a 404.
  const updatedLead = await prisma.lead.update({
    where: { id },
    data: { adminComment },
  });

  // 3. Send the updated lead back to the frontend
  res.status(200).json(updatedLead);
};
