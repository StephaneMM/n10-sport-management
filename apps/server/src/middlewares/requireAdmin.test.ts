import express from 'express';
import request from 'supertest';
import { requireAdmin } from './requireAdmin';
import { errorHandler } from './errorHandler';

function buildApp(role: string | undefined) {
  const app = express();
  app.get(
    '/x',
    (_req, res, next) => {
      if (role !== undefined) res.locals.user = { userId: 'u', email: 'e', role };
      next();
    },
    requireAdmin,
    (_req, res) => {
      res.status(200).json({ ok: true });
    },
  );
  app.use(errorHandler);
  return app;
}

describe('requireAdmin', () => {
  it('lets an ADMIN through', async () => {
    expect((await request(buildApp('ADMIN')).get('/x')).status).toBe(200);
  });

  it.each(['PROSPECT', 'SALES_REP', 'COACH', undefined])('blocks %s with 403', async (role) => {
    const response = await request(buildApp(role)).get('/x');
    expect(response.status).toBe(403);
  });
});
