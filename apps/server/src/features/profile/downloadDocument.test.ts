import { Readable } from 'node:stream';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../server';
import { prisma } from '../../lib/prisma';
import { getObjectStream } from '../../lib/storage.service';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    document: { findUnique: jest.fn() },
  },
}));

jest.mock('../../lib/storage.service', () => ({ getObjectStream: jest.fn() }));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  document: { findUnique: jest.Mock };
};
const mockedStream = getObjectStream as jest.Mock;

const secret = process.env.JWT_SECRET as string;
const ownerToken = jwt.sign({ userId: 'user-1', role: 'PROSPECT' }, secret);
const strangerToken = jwt.sign({ userId: 'user-2', role: 'PROSPECT' }, secret);
const DOC_ID = '11111111-1111-1111-1111-111111111111';

function download(id = DOC_ID, token = ownerToken) {
  return request(app)
    .get(`/api/profiles/me/documents/${id}/download`)
    .set('Authorization', `Bearer ${token}`);
}

describe('GET /api/profiles/me/documents/:id/download', () => {
  beforeEach(() => {
    mockedPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      email: `${where.id}@n10.test`,
      role: 'PROSPECT',
    }));
    mockedPrisma.document.findUnique.mockResolvedValue({
      id: DOC_ID,
      fileKey: 'documents/uuid/transcript.pdf',
      fileName: 'transcript.pdf',
      mimeType: 'application/pdf',
      prospectProfile: { userId: 'user-1' },
    });
    mockedStream.mockResolvedValue(Readable.from(Buffer.from('%PDF-1.4 body')));
  });

  it('streams the file with its stored content type and a download disposition', async () => {
    const response = await download();

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toBe('attachment; filename="transcript.pdf"');
    expect(Buffer.from(response.body).toString()).toBe('%PDF-1.4 body');
    expect(mockedStream).toHaveBeenCalledWith('documents/uuid/transcript.pdf');
  });

  it("returns 404 for another prospect's document (no existence leak)", async () => {
    const response = await download(DOC_ID, strangerToken);
    expect(response.status).toBe(404);
    expect(mockedStream).not.toHaveBeenCalled();
  });

  it('returns 404 when the document does not exist', async () => {
    mockedPrisma.document.findUnique.mockResolvedValue(null);
    expect((await download()).status).toBe(404);
  });

  it('rejects a non-uuid id with 400', async () => {
    expect((await download('not-a-uuid')).status).toBe(400);
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app).get(`/api/profiles/me/documents/${DOC_ID}/download`);
    expect(response.status).toBe(401);
  });
});
