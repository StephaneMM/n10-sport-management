import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../../lib/prisma';

jest.mock('../../lib/prisma', () => ({
  prisma: { lead: { create: jest.fn() } },
}));

const mockedPrisma = prisma as unknown as { lead: { create: jest.Mock } };

const validLead = {
  firstName: 'Ana',
  lastName: 'Silva',
  email: 'ana@example.com',
  phone: '+55 11 99999-9999',
  country: 'Brazil',
  dateOfBirth: '2008-05-14',
  nationality: 'Brazilian',
  gender: 'Female',
  sport: 'Volleyball',
  positions: ['Outside Hitter'],
  heightCm: 182,
  weightKg: 70,
  source: 'INSTAGRAM',
  consentToContact: true,
};

describe('POST /api/leads', () => {
  beforeEach(() => {
    mockedPrisma.lead.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'lead-1',
      ...data,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    }));
  });

  it('creates a lead from an anonymous submission (no auth required)', async () => {
    const response = await request(app).post('/api/leads').send(validLead);

    expect(response.status).toBe(201);
    expect(response.body.lead).toMatchObject({ email: 'ana@example.com', sport: 'Volleyball' });
    expect(mockedPrisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ firstName: 'Ana', positions: ['Outside Hitter'] }),
      }),
    );
  });

  it('defaults highlightLinks to an empty array', async () => {
    await request(app).post('/api/leads').send(validLead);
    const { data } = mockedPrisma.lead.create.mock.calls[0][0];
    expect(data.highlightLinks).toEqual([]);
  });

  it('coerces the ISO dateOfBirth string to a Date', async () => {
    await request(app).post('/api/leads').send(validLead);
    const { data } = mockedPrisma.lead.create.mock.calls[0][0];
    expect(data.dateOfBirth).toEqual(new Date('2008-05-14'));
  });

  it.each([
    ['an invalid email', { ...validLead, email: 'not-an-email' }],
    ['a missing first name', { ...validLead, firstName: '' }],
    ['a non-positive height', { ...validLead, heightCm: -5 }],
    ['no positions', { ...validLead, positions: [] }],
    ['a non-URL highlight link', { ...validLead, highlightLinks: ['not a url'] }],
    ['a missing dateOfBirth', { ...validLead, dateOfBirth: undefined }],
    ['a future dateOfBirth', { ...validLead, dateOfBirth: '2999-01-01' }],
    ['a missing source', { ...validLead, source: undefined }],
    ['an unknown source', { ...validLead, source: 'WORD_OF_MOUTH' }],
    ['consent not given', { ...validLead, consentToContact: false }],
    ['missing consent', { ...validLead, consentToContact: undefined }],
  ])('rejects %s with 400', async (_label, body) => {
    const response = await request(app).post('/api/leads').send(body);

    expect(response.status).toBe(400);
    expect(mockedPrisma.lead.create).not.toHaveBeenCalled();
  });
});
