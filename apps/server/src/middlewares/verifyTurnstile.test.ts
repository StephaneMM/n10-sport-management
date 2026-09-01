import express from 'express';
import request from 'supertest';
import { verifyTurnstile } from './verifyTurnstile';
import { errorHandler } from './errorHandler';

jest.mock('../config/env', () => ({ env: { TURNSTILE_SECRET_KEY: undefined } }));
import { env } from '../config/env';

const mockedEnv = env as unknown as { TURNSTILE_SECRET_KEY: string | undefined };
const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/x', verifyTurnstile, (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

beforeEach(() => {
  fetchMock.mockReset();
  mockedEnv.TURNSTILE_SECRET_KEY = undefined;
});

describe('verifyTurnstile', () => {
  it('passes through when no secret is configured', async () => {
    const response = await request(buildApp()).post('/x').send({});

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a request with no token once a secret is set', async () => {
    mockedEnv.TURNSTILE_SECRET_KEY = 'secret';

    const response = await request(buildApp()).post('/x').send({});

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a token Cloudflare does not accept', async () => {
    mockedEnv.TURNSTILE_SECRET_KEY = 'secret';
    fetchMock.mockResolvedValue({ json: async () => ({ success: false }) });

    const response = await request(buildApp()).post('/x').send({ turnstileToken: 'bad' });

    expect(response.status).toBe(403);
  });

  it('passes a token Cloudflare accepts', async () => {
    mockedEnv.TURNSTILE_SECRET_KEY = 'secret';
    fetchMock.mockResolvedValue({ json: async () => ({ success: true }) });

    const response = await request(buildApp()).post('/x').send({ turnstileToken: 'good' });

    expect(response.status).toBe(200);
  });

  it('fails closed with 503 when Cloudflare is unreachable', async () => {
    mockedEnv.TURNSTILE_SECRET_KEY = 'secret';
    fetchMock.mockRejectedValue(new Error('network down'));

    const response = await request(buildApp()).post('/x').send({ turnstileToken: 'x' });

    expect(response.status).toBe(503);
  });
});
