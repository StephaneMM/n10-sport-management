import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../../lib/prisma';
import { notifyNewLead } from './notifyNewLead';

jest.mock('../../lib/prisma', () => ({
  prisma: { lead: { create: jest.fn() } },
}));

// This suite exercises validation with many submissions; the real
// publicLeadLimiter (15/hour) would start returning 429. Rate limiting has its
// own coverage in rateLimit.test.ts.
type Next = () => void;
jest.mock('../../middlewares/rateLimit', () => {
  const passthrough = (_req: unknown, _res: unknown, next: Next) => next();
  return {
    publicLeadLimiter: passthrough,
    authLimiter: passthrough,
    apiLimiter: passthrough,
    formDiagnosticsLimiter: passthrough,
  };
});

jest.mock('./notifyNewLead', () => ({ notifyNewLead: jest.fn() }));

const mockedPrisma = prisma as unknown as { lead: { create: jest.Mock } };
const mockedNotify = notifyNewLead as jest.Mock;

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

  it('notifies the N10 team with the saved lead', async () => {
    await request(app).post('/api/leads').send(validLead);

    expect(mockedNotify).toHaveBeenCalledTimes(1);
    expect(mockedNotify).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-1', email: 'ana@example.com' }),
    );
  });

  it('does not notify when the submission is invalid', async () => {
    const response = await request(app)
      .post('/api/leads')
      .send({ ...validLead, email: 'not-an-email' });

    expect(response.status).toBe(400);
    expect(mockedNotify).not.toHaveBeenCalled();
  });

  it('accepts safe client diagnostic metadata without recording submitted values', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const response = await request(app)
      .post('/api/diagnostics/form-validation')
      .set('x-vercel-id', 'iad1::test-request')
      .send({
        event: 'client_validation_failed',
        fields: [{ field: 'verticalJumpCm', code: 'too_big', valueType: 'string', valueLength: 4 }],
        siteKeyConfigured: true,
      });

    expect(response.status).toBe(202);
    expect(warn).toHaveBeenCalledWith('Lead form client diagnostic', expect.objectContaining({
      requestId: 'iad1::test-request',
      event: 'client_validation_failed',
      fields: [{ field: 'verticalJumpCm', code: 'too_big', valueType: 'string', valueLength: 4 }],
    }));
    expect(JSON.stringify(warn.mock.calls)).not.toContain('applicant@example.com');
    warn.mockRestore();
  });

  it('rejects diagnostic payloads containing raw form values', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const response = await request(app)
      .post('/api/diagnostics/form-validation')
      .send({ event: 'client_validation_failed', email: 'applicant@example.com' });

    expect(response.status).toBe(400);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('defaults highlightLinks to an empty array', async () => {
    await request(app).post('/api/leads').send(validLead);
    const { data } = mockedPrisma.lead.create.mock.calls[0][0];
    expect(data.highlightLinks).toEqual([]);
  });

  it('accepts a minor when guardian contact is provided', async () => {
    const response = await request(app)
      .post('/api/leads')
      .send({
        ...validLead,
        dateOfBirth: '2012-06-15',
        guardianName: 'Rosa Silva',
        guardianEmail: 'Rosa.Silva@Example.com',
        guardianPhone: '+55 11 98888-0000',
        guardianRelationship: 'Mother',
      });

    expect(response.status).toBe(201);
    const { data } = mockedPrisma.lead.create.mock.calls[0][0];
    expect(data.guardianEmail).toBe('rosa.silva@example.com');
  });

  it('coerces the ISO dateOfBirth string to a Date', async () => {
    await request(app).post('/api/leads').send(validLead);
    const { data } = mockedPrisma.lead.create.mock.calls[0][0];
    expect(data.dateOfBirth).toEqual(new Date('2008-05-14'));
  });

  it('rejects a body larger than the JSON limit before parsing it', async () => {
    const response = await request(app)
      .post('/api/leads')
      .send({ ...validLead, messageToUs: 'x'.repeat(20_000) });

    expect(response.status).toBe(413);
    expect(mockedPrisma.lead.create).not.toHaveBeenCalled();
  });

  it('stores an optional preferredLanguage', async () => {
    await request(app).post('/api/leads').send({ ...validLead, preferredLanguage: 'FR' });
    const { data } = mockedPrisma.lead.create.mock.calls[0][0];
    expect(data.preferredLanguage).toBe('FR');
  });

  it.each([
    ['an invalid email', { ...validLead, email: 'not-an-email' }],
    ['a missing first name', { ...validLead, firstName: '' }],
    ['a non-positive height', { ...validLead, heightCm: -5 }],
    ['no positions', { ...validLead, positions: [] }],
    ['an empty position item', { ...validLead, positions: ['Outside Hitter', ''] }],
    ['a position longer than 60 characters', { ...validLead, positions: ['P'.repeat(61)] }],
    ['a non-URL highlight link', { ...validLead, highlightLinks: ['not a url'] }],
    ['a javascript: highlight link', { ...validLead, highlightLinks: ['javascript:alert(document.cookie)'] }],
    ['too many highlight links', { ...validLead, highlightLinks: Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`) }],
    ['a missing dateOfBirth', { ...validLead, dateOfBirth: undefined }],
    ['a future dateOfBirth', { ...validLead, dateOfBirth: '2999-01-01' }],
    ['a missing source', { ...validLead, source: undefined }],
    ['an unknown source', { ...validLead, source: 'WORD_OF_MOUTH' }],
    ['an over-long first name', { ...validLead, firstName: 'a'.repeat(101) }],
    ['too many positions', { ...validLead, positions: Array.from({ length: 21 }, () => 'X') }],
    ['an over-long message', { ...validLead, messageToUs: 'x'.repeat(2001) }],
    ['a vertical jump over 200cm', { ...validLead, verticalJumpCm: 201 }],
    ['consent not given', { ...validLead, consentToContact: false }],
    ['missing consent', { ...validLead, consentToContact: undefined }],
    ['an unknown preferredLanguage', { ...validLead, preferredLanguage: 'PT' }],
    ['a minor without guardian contact', { ...validLead, dateOfBirth: '2012-06-15' }],
    [
      'a minor missing the guardian email',
      { ...validLead, dateOfBirth: '2012-06-15', guardianName: 'Rosa Silva', guardianPhone: '+55 11 8888' },
    ],
  ])('rejects %s with 400', async (_label, body) => {
    const response = await request(app).post('/api/leads').send(body);

    expect(response.status).toBe(400);
    expect(mockedPrisma.lead.create).not.toHaveBeenCalled();
  });
});
