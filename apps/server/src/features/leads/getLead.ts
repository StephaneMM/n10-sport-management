import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/httpError';
import { GetLeadInput } from './lead.schema';

export const getLeadHandler = async (
  req: Request<GetLeadInput>,
  res: Response
): Promise<void> => {
  // Admin-only — enforced by requireAdmin on the route.
  const { id } = req.params;
  const lead = await prisma.lead.findUnique({
    where: { id },
  });

  // 3. Handle the 404 Case
  if (!lead) {
    throw new HttpError(404, 'Lead not found.');
  }

  // 4. Send the raw object back to match the frontend's expectations
  res.status(200).json(lead);
};
