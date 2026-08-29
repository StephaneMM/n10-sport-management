import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../server';
import { prisma } from '../../lib/prisma';
import { putObject } from '../../lib/storage.service';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    prospectProfile: { findUnique: jest.fn() },
    document: { create: jest.fn() },
  },
}));

jest.mock('../../lib/storage.service', () => ({ putObject: jest.fn() }));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  prospectProfile: { findUnique: jest.Mock };
  document: { create: jest.Mock };
};
const mockedPut = putObject as jest.Mock;

const token = jwt.sign({ userId: 'user-1', role: 'PROSPECT' }, process.env.JWT_SECRET as string);

function postDocument({ type = 'HS_TRANSCRIPT', withFile = true } = {}) {
  const req = request(app)
    .post('/api/profiles/me/documents')
    .set('Authorization', `Bearer ${token}`)
    .field('type', type);
  return withFile
    ? req.attach('document', Buffer.from('%PDF-1.4 fake'), {
        filename: 'transcript.pdf',
        contentType: 'application/pdf',
      })
    : req;
}

describe('POST /api/profiles/me/documents', () => {
  beforeEach(() => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'p@n10.test', role: 'PROSPECT' });
    mockedPrisma.prospectProfile.findUnique.mockResolvedValue({ id: 'profile-1' });
    mockedPut.mockResolvedValue({ key: 'documents/uuid/transcript.pdf', fileName: 'transcript.pdf' });
    mockedPrisma.document.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'doc-1',
      ...data,
    }));
  });

  it('stores the file in R2 and persists key + metadata', async () => {
    const response = await postDocument();

    expect(response.status).toBe(201);
    expect(mockedPut).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fileKey: 'documents/uuid/transcript.pdf',
          fileName: 'transcript.pdf',
          mimeType: 'application/pdf',
          type: 'HS_TRANSCRIPT',
          prospectProfileId: 'profile-1',
        }),
      }),
    );
  });

  it('returns 400 when no file is attached', async () => {
    const response = await postDocument({ withFile: false });
    expect(response.status).toBe(400);
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('returns 400 for an empty (0-byte) file', async () => {
    const response = await request(app)
      .post('/api/profiles/me/documents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'HS_TRANSCRIPT')
      .attach('document', Buffer.alloc(0), { filename: 'empty.pdf', contentType: 'application/pdf' });

    expect(response.status).toBe(400);
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('returns 400 for an unknown document type', async () => {
    const response = await postDocument({ type: 'NOT_A_TYPE' });
    expect(response.status).toBe(400);
  });

  it('returns a JSON 400 (not HTML 500) when the file is over 5 MB', async () => {
    const response = await request(app)
      .post('/api/profiles/me/documents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'HS_TRANSCRIPT')
      .attach('document', Buffer.alloc(6 * 1024 * 1024), {
        filename: 'big.pdf',
        contentType: 'application/pdf',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/5 MB/);
  });

  it('returns a JSON 400 for an unsupported file type', async () => {
    const response = await request(app)
      .post('/api/profiles/me/documents')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'HS_TRANSCRIPT')
      .attach('document', Buffer.from('text'), { filename: 'notes.txt', contentType: 'text/plain' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/allowed/i);
  });

  it('returns 404 (and does not touch storage) when the prospect has no profile', async () => {
    mockedPrisma.prospectProfile.findUnique.mockResolvedValue(null);

    const response = await postDocument();

    expect(response.status).toBe(404);
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    const response = await request(app)
      .post('/api/profiles/me/documents')
      .field('type', 'HS_TRANSCRIPT');
    expect(response.status).toBe(401);
  });
});
