import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { errorHandler } from './errorHandler';

function appThatThrows(err: unknown) {
  const app = express();
  app.get('/boom', (_req, _res, next) => next(err));
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('errorHandler', () => {
  it('maps a ZodError to a JSON 400 with issues', async () => {
    let zodError: unknown;
    try {
      z.object({ a: z.string() }).parse({});
    } catch (error) {
      zodError = error;
    }

    const response = await request(appThatThrows(zodError)).get('/boom');

    expect(response.status).toBe(400);
    expect(Array.isArray(response.body.errors)).toBe(true);
  });

  it('maps any other error to a generic logged 500 (no stack trace)', async () => {
    const response = await request(appThatThrows(new Error('kaboom'))).get('/boom');

    expect(response.status).toBe(500);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({ error: 'Internal server error' });
  });
});
