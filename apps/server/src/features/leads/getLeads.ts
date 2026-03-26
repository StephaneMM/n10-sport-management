import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

export const getLeadsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check the role from the JWT
    const userRole = res.locals.user.role;
    
    if (userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: You must be an admin to view leads.' });
      return;
    }
 
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' }, // Show newest leads first
    });

    res.status(200).json({ leads });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
