import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { listLeadsQuerySchema } from './lead.schema';

export const getLeadsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (res.locals.user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Forbidden: You must be an admin to view leads.' });
      return;
    }

    const parsed = listLeadsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.issues });
      return;
    }

    const {
      page,
      pageSize,
      search,
      sport,
      nationality,
      gender,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = parsed.data;

    const where: Prisma.LeadWhereInput = {
      ...(sport ? { sport } : {}),
      ...(nationality ? { nationality } : {}),
      ...(gender ? { gender } : {}),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { [sortBy]: sortOrder } as Prisma.LeadOrderByWithRelationInput,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    res.status(200).json({
      leads,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
