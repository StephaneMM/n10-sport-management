import request from 'supertest';
import { Prisma } from '@prisma/client';
import { app } from '../../server';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/jwt';

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

const adminToken = signToken({ userId: 'admin-1', role: 'ADMIN' });
const prospectToken = signToken({ userId: 'p-1', role: 'PROSPECT' });
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

  it('updates the status on its own', async () => {
    mockedPrisma.lead.update.mockResolvedValue({ id: LEAD_ID, status: 'CONTACTED' });

    const response = await request(app)
      .patch(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'CONTACTED' });

    expect(response.status).toBe(200);
    expect(mockedPrisma.lead.update).toHaveBeenCalledWith({
      where: { id: LEAD_ID },
      data: { status: 'CONTACTED' },
    });
  });

  it('updates status and comment together', async () => {
    mockedPrisma.lead.update.mockResolvedValue({ id: LEAD_ID });

    await request(app)
      .patch(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ adminComment: 'called, keen', status: 'QUALIFIED' });

    expect(mockedPrisma.lead.update).toHaveBeenCalledWith({
      where: { id: LEAD_ID },
      data: { adminComment: 'called, keen', status: 'QUALIFIED' },
    });
  });

  it('rejects an unknown status with 400', async () => {
    const response = await request(app)
      .patch(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'MAYBE_LATER' });

    expect(response.status).toBe(400);
    expect(mockedPrisma.lead.update).not.toHaveBeenCalled();
  });

  it('rejects an empty payload with 400', async () => {
    const response = await request(app)
      .patch(`/api/leads/${LEAD_ID}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(mockedPrisma.lead.update).not.toHaveBeenCalled();
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
