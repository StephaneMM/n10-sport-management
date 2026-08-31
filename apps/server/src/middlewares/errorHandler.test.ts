import express from 'express';
import request from 'supertest';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { errorHandler } from './errorHandler';
import { HttpError } from '../lib/httpError';

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
  it('maps an HttpError to its status and message', async () => {
    const response = await request(appThatThrows(new HttpError(403, 'Nope'))).get('/boom');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Nope' });
  });

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

  it('maps Prisma P2025 (record not found) to a 404', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: 'test',
    });

    const response = await request(appThatThrows(err)).get('/boom');

    expect(response.status).toBe(404);
  });

  it('maps Prisma P2002 (unique constraint) to a 409', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

    const response = await request(appThatThrows(err)).get('/boom');

    expect(response.status).toBe(409);
  });

  it('honours a 4xx status carried on the error (malformed JSON body)', async () => {
    const response = await request(express().use(express.json()).use(errorHandler))
      .post('/anything')
      .set('Content-Type', 'application/json')
      .send('{"broken": ');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Malformed JSON in request body' });
  });

  it('maps any other error to a generic logged 500 (no stack trace)', async () => {
    const response = await request(appThatThrows(new Error('kaboom'))).get('/boom');

    expect(response.status).toBe(500);
    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({ error: 'Internal server error' });
  });
});
