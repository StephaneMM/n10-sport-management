import express from 'express';
import request from 'supertest';
import { createRateLimiter } from './rateLimit';
import { app } from '../server';
import { prisma } from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  prisma: { user: { findUnique: jest.fn(), create: jest.fn() } },
}));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; create: jest.Mock };
};

function buildApp(options: Parameters<typeof createRateLimiter>[0]) {
  const testApp = express();
  // Match production: trust one proxy hop so req.ip comes from X-Forwarded-For.
  testApp.set('trust proxy', 1);
  testApp.use(express.json());
  testApp.post('/thing', createRateLimiter(options), (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return testApp;
}

describe('createRateLimiter', () => {
  it('allows requests up to the limit, then answers 429 with a JSON error', async () => {
    const testApp = buildApp({ windowMs: 60_000, limit: 2 });

    expect((await request(testApp).post('/thing')).status).toBe(200);
    expect((await request(testApp).post('/thing')).status).toBe(200);

    const blocked = await request(testApp).post('/thing');
    expect(blocked.status).toBe(429);
    expect(blocked.body).toHaveProperty('error');
  });

  it('exposes standard RateLimit headers and no legacy ones', async () => {
    const testApp = buildApp({ windowMs: 60_000, limit: 5 });
    const response = await request(testApp).post('/thing');

    expect(response.headers).toHaveProperty('ratelimit');
    expect(response.headers['x-ratelimit-limit']).toBeUndefined();
  });

  it('does not count successful requests when skipSuccessfulRequests is set', async () => {
    const testApp = buildApp({ windowMs: 60_000, limit: 2, skipSuccessfulRequests: true });

    for (let i = 0; i < 6; i += 1) {
      // Every request succeeds, so none of them count towards the limit of 2.
      expect((await request(testApp).post('/thing')).status).toBe(200);
    }
  });

  it('keys each client IP separately (from X-Forwarded-For behind a proxy)', async () => {
    const testApp = buildApp({ windowMs: 60_000, limit: 1 });
    const from = (ip: string) => request(testApp).post('/thing').set('X-Forwarded-For', ip);

    expect((await from('203.0.113.1')).status).toBe(200);
    expect((await from('203.0.113.1')).status).toBe(429); // same client, over limit
    expect((await from('198.51.100.7')).status).toBe(200); // different client, own bucket
  });
});

describe('authLimiter on POST /api/auth/login', () => {
  beforeEach(() => {
    mockedPrisma.user.findUnique.mockResolvedValue(null); // every login attempt fails
  });

  it('throttles repeated failed login attempts with 429', async () => {
    const attempt = () =>
      request(app)
        .post('/api/auth/login')
        .send({ email: 'attacker@n10.test', password: 'WrongPassw0rd!' });

    // authLimiter allows 15 failures per window; keep going well past that.
    const statuses: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      statuses.push((await attempt()).status);
    }

    expect(statuses.slice(0, 15).every((s) => s === 401)).toBe(true);
    expect(statuses).toContain(429);
  });
});

describe('publicLeadLimiter on POST /api/leads', () => {
  it('throttles repeated submissions with 429', async () => {
    // An empty body 400s at validation, but the limiter (which runs first) still
    // counts every request. Limit is 15/hour.
    const submit = () => request(app).post('/api/leads').send({});

    const statuses: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      statuses.push((await submit()).status);
    }

    expect(statuses.slice(0, 15).every((s) => s === 400)).toBe(true);
    expect(statuses).toContain(429);
  });
});
