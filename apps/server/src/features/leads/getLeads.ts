import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { HttpError } from '../../lib/httpError';
import { listLeadsQuerySchema } from './lead.schema';

export const getLeadsHandler = async (req: Request, res: Response): Promise<void> => {
  if (res.locals.user.role !== 'ADMIN') {
    throw new HttpError(403, 'Forbidden: You must be an admin to view leads.');
  }

  // A bad query string throws a ZodError, which the errorHandler turns into a
  // 400 with the issue list.
  const {
    page,
    pageSize,
    search,
    sport,
    nationality,
    gender,
    status,
    source,
    preferredLanguage,
    dateFrom,
    dateTo,
    sortBy,
    sortOrder,
  } = listLeadsQuerySchema.parse(req.query);

  const where: Prisma.LeadWhereInput = {
    ...(sport ? { sport } : {}),
    ...(nationality ? { nationality } : {}),
    ...(gender ? { gender } : {}),
    ...(status ? { status } : {}),
    ...(source ? { source } : {}),
    ...(preferredLanguage ? { preferredLanguage } : {}),
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
};
