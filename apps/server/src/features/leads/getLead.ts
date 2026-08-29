import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { GetLeadInput } from './lead.schema';

export const getLeadHandler = async (
  req: Request<GetLeadInput>,
  res: Response
): Promise<void> => {
  try {
    // 1. The Admin Bouncer
    const userRole = res.locals.user.role;
    if (userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: You must be an admin to view lead details.' });
      return;
    }

    // 2. Fetch the specific lead
    const { id } = req.params;
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    // 3. Handle the 404 Case
    if (!lead) {
      res.status(404).json({ error: 'Lead not found.' });
      return;
    }

    // 4. Send the raw object back to match Lovable's expectations
    res.status(200).json(lead);
  } catch (error) {
    console.error('Get single lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};