import request from 'supertest';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { app } from '../../server';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    lead: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  lead: { findUnique: jest.Mock; update: jest.Mock };
};

const secret = process.env.JWT_SECRET as string;
const adminToken = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, secret);
const prospectToken = jwt.sign({ userId: 'p-1', role: 'PROSPECT' }, secret);
const LEAD_ID = '11111111-1111-1111-1111-111111111111';

beforeEach(() => {
  mockedPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
    id: where.id,
    email: `${where.id}@n10.test`,
    role: where.id === 'admin-1' ? 'ADMIN' : 'PROSPECT',
  }));
});

describe('GET /api/leads/:id', () => {
  it('returns the lead for an admin', async () => {
    mockedPrisma.lead.findUnique.mockResolvedValue({ id: LEAD_ID, firstName: 'Ana' });

    const response = await request(app)
      .get(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.firstName).toBe('Ana');
  });

  it('returns 403 for a non-admin (and never queries the lead)', async () => {
    const response = await request(app)
      .get(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${prospectToken}`);

    expect(response.status).toBe(403);
    expect(mockedPrisma.lead.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when the lead is unknown', async () => {
    mockedPrisma.lead.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
  });

  it('rejects a non-uuid id with 400', async () => {
    const response = await request(app)
      .get('/api/leads/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
  });

  it('rejects an unauthenticated request', async () => {
    expect((await request(app).get(`/api/leads/${LEAD_ID}`)).status).toBe(401);
  });
});

describe('PATCH /api/leads/:id', () => {
  it('updates the admin comment', async () => {
    mockedPrisma.lead.update.mockResolvedValue({ id: LEAD_ID, adminComment: 'reviewed' });

    const response = await request(app)
      .patch(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminComment: 'reviewed' });

    expect(response.status).toBe(200);
    expect(mockedPrisma.lead.update).toHaveBeenCalledWith({
      where: { id: LEAD_ID },
      data: { adminComment: 'reviewed' },
    });
  });

  it('returns 403 for a non-admin', async () => {
    const response = await request(app)
      .patch(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${prospectToken}`)
      .send({ adminComment: 'x' });

    expect(response.status).toBe(403);
    expect(mockedPrisma.lead.update).not.toHaveBeenCalled();
  });

  it('returns 404 when Prisma reports the row is missing (P2025)', async () => {
    mockedPrisma.lead.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    );

    const response = await request(app)
      .patch(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminComment: 'x' });

    expect(response.status).toBe(404);
  });

  it('rejects an empty comment with 400', async () => {
    const response = await request(app)
      .patch(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminComment: '' });

    expect(response.status).toBe(400);
  });
});
