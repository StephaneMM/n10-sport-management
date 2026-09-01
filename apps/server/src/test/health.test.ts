import request from 'supertest';
import { app } from '../server';

describe('GET /health', () => {
  it('reports that the server is up', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('CORS', () => {
  it('reflects an allowed origin (the test default includes localhost:8080)', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:8080');

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:8080');
  });

  it('does not allow an unlisted origin', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example.com');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
