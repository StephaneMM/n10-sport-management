import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../../lib/prisma';
import { signToken } from '../../lib/jwt';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    prospectProfile: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  prospectProfile: { findUnique: jest.Mock; create: jest.Mock };
};

const token = signToken({ userId: 'user-1', role: 'PROSPECT' });

const validBody = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  dob: '2005-05-01',
  phoneNumber: '+1 555 0100',
  country: 'United Kingdom',
  nationality: 'British',
  gender: 'Female',
  heightCm: 170,
  weightKg: 60,
  sport: 'Basketball',
  positions: ['Guard'],
};

describe('POST /api/profiles', () => {
  beforeEach(() => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'ada@n10.test', role: 'PROSPECT' });
    mockedPrisma.prospectProfile.findUnique.mockResolvedValue(null);
    mockedPrisma.prospectProfile.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'profile-1',
      ...data,
    }));
  });

  it('creates a profile including phoneNumber and country', async () => {
    const response = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);

    expect(response.status).toBe(201);
    expect(mockedPrisma.prospectProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          phoneNumber: '+1 555 0100',
          country: 'United Kingdom',
        }),
      }),
    );
  });

  it.each(['phoneNumber', 'country'])('rejects a request missing %s', async (field) => {
    const body: Record<string, unknown> = { ...validBody };
    delete body[field];

    const response = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${token}`)
      .send(body);

    expect(response.status).toBe(400);
    expect(mockedPrisma.prospectProfile.create).not.toHaveBeenCalled();
  });

  it('returns 409 when the user already has a profile', async () => {
    mockedPrisma.prospectProfile.findUnique.mockResolvedValue({ id: 'existing' });

    const response = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${token}`)
      .send(validBody);

    expect(response.status).toBe(409);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).post('/api/profiles').send(validBody);
    expect(response.status).toBe(401);
  });
});
