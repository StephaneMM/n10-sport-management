import request from 'supertest';
import { app } from '../server';

describe('GET /health', () => {
  it('reports that the server is up', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', message: 'N10 Server is running' });
  });
});
