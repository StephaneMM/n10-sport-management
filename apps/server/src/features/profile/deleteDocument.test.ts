import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../server';
import { prisma } from '../../lib/prisma';
import { deleteObject } from '../../lib/storage.service';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    document: { findUnique: jest.fn(), delete: jest.fn() },
  },
}));

jest.mock('../../lib/storage.service', () => ({ deleteObject: jest.fn() }));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  document: { findUnique: jest.Mock; delete: jest.Mock };
};
const mockedDelete = deleteObject as jest.Mock;

const secret = process.env.JWT_SECRET as string;
const ownerToken = jwt.sign({ userId: 'user-1', role: 'PROSPECT' }, secret);
const strangerToken = jwt.sign({ userId: 'user-2', role: 'PROSPECT' }, secret);
const DOC_ID = '11111111-1111-1111-1111-111111111111';

function remove(id = DOC_ID, token = ownerToken) {
  return request(app)
    .delete(`/api/profiles/me/documents/${id}`)
    .set('Authorization', `Bearer ${token}`);
}

describe('DELETE /api/profiles/me/documents/:id', () => {
  beforeEach(() => {
    mockedPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      email: `${where.id}@n10.test`,
      role: 'PROSPECT',
    }));
    mockedPrisma.document.findUnique.mockResolvedValue({
      id: DOC_ID,
      fileKey: 'documents/uuid/transcript.pdf',
      prospectProfile: { userId: 'user-1' },
    });
    mockedPrisma.document.delete.mockResolvedValue({});
    mockedDelete.mockResolvedValue(undefined);
  });

  it('removes the object then the row and returns 204', async () => {
    const response = await remove();

    expect(response.status).toBe(204);
    expect(mockedDelete).toHaveBeenCalledWith('documents/uuid/transcript.pdf');
    expect(mockedPrisma.document.delete).toHaveBeenCalledWith({ where: { id: DOC_ID } });
  });

  it("returns 404 for another prospect's document (row untouched)", async () => {
    const response = await remove(DOC_ID, strangerToken);

    expect(response.status).toBe(404);
    expect(mockedDelete).not.toHaveBeenCalled();
    expect(mockedPrisma.document.delete).not.toHaveBeenCalled();
  });

  it('returns 404 when the document does not exist', async () => {
    mockedPrisma.document.findUnique.mockResolvedValue(null);
    expect((await remove()).status).toBe(404);
  });

  it('keeps the row if the object delete fails', async () => {
    mockedDelete.mockRejectedValue(new Error('r2 down'));

    const response = await remove();

    expect(response.status).toBe(500);
    expect(mockedPrisma.document.delete).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated request', async () => {
    expect((await request(app).delete(`/api/profiles/me/documents/${DOC_ID}`)).status).toBe(401);
  });
});
