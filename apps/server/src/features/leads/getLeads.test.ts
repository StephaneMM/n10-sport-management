import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/jwt';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    lead: { findMany: jest.fn(), count: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  lead: { findMany: jest.Mock; count: jest.Mock };
};

const adminToken = signToken({ userId: 'admin-1', role: 'ADMIN' });
const prospectToken = signToken({ userId: 'p-1', role: 'PROSPECT' });

function listLeads(query = '', token = adminToken) {
  return request(app).get(`/api/leads${query}`).set('Authorization', `Bearer ${token}`);
}

describe('GET /api/leads', () => {
  beforeEach(() => {
    mockedPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      email: `${where.id}@n10.test`,
      role: where.id === 'admin-1' ? 'ADMIN' : 'PROSPECT',
    }));
    mockedPrisma.lead.findMany.mockResolvedValue([]);
    mockedPrisma.lead.count.mockResolvedValue(0);
  });

  it('rejects a non-admin with 403', async () => {
    const response = await listLeads('', prospectToken);
    expect(response.status).toBe(403);
    expect(mockedPrisma.lead.findMany).not.toHaveBeenCalled();
  });

  it('applies default pagination and sort', async () => {
    mockedPrisma.lead.count.mockResolvedValue(3);

    const response = await listLeads();

    expect(response.status).toBe(200);
    expect(response.body.pagination).toEqual({ page: 1, pageSize: 20, total: 3, totalPages: 1 });
    expect(mockedPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        where: {},
      }),
    );
  });

  it('translates page/pageSize into skip/take and computes totalPages', async () => {
    mockedPrisma.lead.count.mockResolvedValue(45);

    const response = await listLeads('?page=3&pageSize=10');

    expect(response.body.pagination).toEqual({ page: 3, pageSize: 10, total: 45, totalPages: 5 });
    expect(mockedPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('builds a case-insensitive OR search across name and email', async () => {
    await listLeads('?search=ada');

    const { where } = mockedPrisma.lead.findMany.mock.calls[0][0];
    expect(where.OR).toEqual([
      { firstName: { contains: 'ada', mode: 'insensitive' } },
      { lastName: { contains: 'ada', mode: 'insensitive' } },
      { email: { contains: 'ada', mode: 'insensitive' } },
    ]);
  });

  it('applies equality filters and a date range', async () => {
    await listLeads('?sport=Soccer&nationality=Brazilian&gender=Male&dateFrom=2026-01-01&dateTo=2026-06-01');

    const { where } = mockedPrisma.lead.findMany.mock.calls[0][0];
    expect(where.sport).toBe('Soccer');
    expect(where.nationality).toBe('Brazilian');
    expect(where.gender).toBe('Male');
    expect(where.createdAt.gte).toEqual(new Date('2026-01-01'));
    expect(where.createdAt.lte).toEqual(new Date('2026-06-01'));
  });

  it('filters by status', async () => {
    await listLeads('?status=QUALIFIED');

    const { where } = mockedPrisma.lead.findMany.mock.calls[0][0];
    expect(where.status).toBe('QUALIFIED');
  });

  it('filters by source', async () => {
    await listLeads('?source=REFERRAL');

    const { where } = mockedPrisma.lead.findMany.mock.calls[0][0];
    expect(where.source).toBe('REFERRAL');
  });

  it('filters by preferredLanguage', async () => {
    await listLeads('?preferredLanguage=FR');

    const { where } = mockedPrisma.lead.findMany.mock.calls[0][0];
    expect(where.preferredLanguage).toBe('FR');
  });

  it('honours sortBy / sortOrder', async () => {
    await listLeads('?sortBy=lastName&sortOrder=asc');
    expect(mockedPrisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { lastName: 'asc' } }),
    );
  });

  it.each([
    '?page=0',
    '?pageSize=500',
    '?sortBy=email',
    '?sortOrder=sideways',
    `?search=${'x'.repeat(101)}`,
  ])(
    'rejects invalid query %s with 400',
    async (query) => {
      const response = await listLeads(query);
      expect(response.status).toBe(400);
      expect(mockedPrisma.lead.findMany).not.toHaveBeenCalled();
    },
  );
});
