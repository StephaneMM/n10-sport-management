import { Response } from 'express';
import { ValidatedRequest } from '../../types/express';
import { prisma } from '../../lib/prisma';
import { CreateLeadInput } from './lead.schema';
import { notifyNewLead } from './notifyNewLead';

export const createLeadHandler = async (
  req: ValidatedRequest<CreateLeadInput>,
  res: Response
): Promise<void> => {
  const leadData = req.body;

  // No requireUser check! Anyone can create a lead.
  const newLead = await prisma.lead.create({
    data: leadData,
  });

  // Awaited, not fire-and-forget: on Vercel the function can be frozen as soon
  // as the response is sent. notifyNewLead never throws.
  await notifyNewLead(newLead);

  res.status(201).json({
    message: 'Lead submitted successfully! Our team will be in touch.',
    lead: newLead,
  });
};
