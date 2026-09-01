import { Response } from 'express';
import { ValidatedRequest } from '../../types/express';
import { prisma } from '../../lib/prisma';
import { UpdateLeadParams, UpdateLeadBody } from './lead.schema';

export const updateLeadHandler = async (
  req: ValidatedRequest<UpdateLeadBody, UpdateLeadParams>,
  res: Response
): Promise<void> => {
  // Admin-only — enforced by requireAdmin on the route.
  const { id } = req.params;
  const { adminComment, status } = req.body;

  // 2. Update only the fields the admin sent. If the id is unknown Prisma
  // throws P2025, which the errorHandler turns into a 404.
  const updatedLead = await prisma.lead.update({
    where: { id },
    data: {
      ...(adminComment !== undefined ? { adminComment } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  });

  // 3. Send the updated lead back to the frontend
  res.status(200).json(updatedLead);
};
