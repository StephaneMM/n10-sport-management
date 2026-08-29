import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { UpdateLeadParams, UpdateLeadBody } from './lead.schema';

export const updateLeadHandler = async (
  req: Request<UpdateLeadParams, {}, UpdateLeadBody>,
  res: Response
): Promise<void> => {
  try {
    // 1. The Admin Bouncer
    const userRole = res.locals.user.role;
    if (userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: You must be an admin to update leads.' });
      return;
    }

    const { id } = req.params;
    const { adminComment } = req.body;

    // 2. Tell Prisma to update the record
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: { adminComment },
    });

    // 3. Send the updated lead back to the frontend
    res.status(200).json(updatedLead);
  } catch (error: any) {
    // If Prisma can't find the ID to update, it throws a specific code (P2025)
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Lead not found.' });
      return;
    }
    console.error('Update lead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};