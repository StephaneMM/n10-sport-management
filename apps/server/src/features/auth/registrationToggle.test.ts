import request from 'supertest';
import type { Express } from 'express';

jest.mock('../../lib/prisma', () => ({
  prisma: { user: { findUnique: jest.fn(), create: jest.fn() } },
}));

/** Load a fresh copy of the app with a specific ENABLE_PUBLIC_REGISTRATION value. */
function loadApp(flag: string): Express {
  const previous = process.env.ENABLE_PUBLIC_REGISTRATION;
  process.env.ENABLE_PUBLIC_REGISTRATION = flag;
  let app!: Express;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- isolateModules needs a sync require
    app = require('../../server').app;
  });
  process.env.ENABLE_PUBLIC_REGISTRATION = previous;
  return app;
}

describe('public registration toggle', () => {
  it('404s POST /api/auth/register when the flag is not "true"', async () => {
    const response = await request(loadApp('false'))
      .post('/api/auth/register')
      .send({ email: 'x@example.com', password: 'Passw0rd!' });

    expect(response.status).toBe(404);
  });

  it('serves the route when the flag is "true"', async () => {
    const response = await request(loadApp('true'))
      .post('/api/auth/register')
      .send({});

    // Reaches validation (400), i.e. the route exists.
    expect(response.status).toBe(400);
  });
});
