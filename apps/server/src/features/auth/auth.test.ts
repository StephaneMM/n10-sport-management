import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { app } from '../../server';
import { prisma } from '../../lib/prisma';
import { BCRYPT_COST } from '../../lib/password';

jest.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
};

const VALID_PASSWORD = 'Passw0rd!';

/**
 * Logs in and returns a valid JWT. `mockResolvedValueOnce` so only the login
 * lookup is stubbed — the caller controls what the subsequent per-request
 * revalidation lookup in requireUser returns.
 */
async function loginAndGetToken(role = 'ADMIN'): Promise<string> {
  mockedPrisma.user.findUnique.mockResolvedValueOnce({
    id: 'user-1',
    email: 'member@n10.test',
    password: await bcrypt.hash(VALID_PASSWORD, BCRYPT_COST - 2),
    role,
  });
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'member@n10.test', password: VALID_PASSWORD });
  return response.body.token as string;
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    mockedPrisma.user.create.mockImplementation(async ({ data }: { data: { email: string; role: string } }) => ({
      id: 'user-1',
      email: data.email,
      role: data.role,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    }));
  });

  it('creates a PROSPECT and never echoes the password back', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'prospect@n10.test', password: VALID_PASSWORD });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({ email: 'prospect@n10.test', role: 'PROSPECT' });
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('rejects an attempt to self-assign a role (privilege escalation)', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'evil@n10.test', password: VALID_PASSWORD, role: 'ADMIN' });

    expect(response.status).toBe(400);
    expect(mockedPrisma.user.create).not.toHaveBeenCalled();
  });

  it('always persists role PROSPECT regardless of input', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'prospect2@n10.test', password: VALID_PASSWORD });

    expect(mockedPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'PROSPECT' }) }),
    );
  });

  it('stores a bcrypt hash, not the plaintext password', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'hash@n10.test', password: VALID_PASSWORD });

    const { data } = mockedPrisma.user.create.mock.calls[0][0];
    expect(data.password).not.toBe(VALID_PASSWORD);
    await expect(bcrypt.compare(VALID_PASSWORD, data.password)).resolves.toBe(true);
  });

  it.each([
    ['too short', 'Ab1!'],
    ['no uppercase', 'passw0rd!'],
    ['no number', 'Password!'],
    ['no special character', 'Passw0rd1'],
    ['over the 72-byte bcrypt limit', `A1!${'a'.repeat(80)}`],
  ])('rejects a weak password (%s)', async (_label, password) => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'weak@n10.test', password });

    expect(response.status).toBe(400);
    expect(mockedPrisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: VALID_PASSWORD });

    expect(response.status).toBe(400);
  });

  it('returns 409 when the email is already registered', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dupe@n10.test', password: VALID_PASSWORD });

    expect(response.status).toBe(409);
    expect(mockedPrisma.user.create).not.toHaveBeenCalled();
  });

  it('lowercases and trims the email before storing it', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: '  Prospect@N10.TEST  ', password: VALID_PASSWORD });

    expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'prospect@n10.test' },
    });
    expect(mockedPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ email: 'prospect@n10.test' }) }),
    );
  });
});

describe('POST /api/auth/login', () => {
  let legacyHash: string;

  beforeAll(async () => {
    legacyHash = await bcrypt.hash(VALID_PASSWORD, BCRYPT_COST - 2);
  });

  beforeEach(() => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'member@n10.test',
      password: legacyHash,
      role: 'ADMIN',
    });
    mockedPrisma.user.update.mockResolvedValue({});
  });

  const costMarker = new RegExp(`^\\$2[aby]\\$${String(BCRYPT_COST).padStart(2, '0')}\\$`);

  it('transparently upgrades a lower-cost password hash on login', async () => {
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'member@n10.test', password: VALID_PASSWORD });

    expect(mockedPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { password: expect.stringMatching(costMarker) },
      }),
    );
  });

  it('does not re-hash a current-cost password', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'member@n10.test',
      password: await bcrypt.hash(VALID_PASSWORD, BCRYPT_COST),
      role: 'ADMIN',
    });

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'member@n10.test', password: VALID_PASSWORD });

    expect(mockedPrisma.user.update).not.toHaveBeenCalled();
  });

  it('returns a JWT and only the safe user fields on valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member@n10.test', password: VALID_PASSWORD });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.user).toEqual({ id: 'user-1', email: 'member@n10.test', role: 'ADMIN' });
    expect(response.body.user).not.toHaveProperty('password');

    const decoded = jwt.decode(response.body.token) as { iat: number; exp: number };
    expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60); // 1 day
  });

  it('still runs bcrypt for an unknown email (no timing oracle)', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);
    const compareSpy = jest.spyOn(bcrypt, 'compare');

    await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@n10.test', password: VALID_PASSWORD });

    expect(compareSpy).toHaveBeenCalled();
    compareSpy.mockRestore();
  });

  it('returns a generic 401 when the email is unknown', async () => {
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@n10.test', password: VALID_PASSWORD });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email and/or password');
  });

  it('returns the same 401 message on a wrong password (no user enumeration)', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member@n10.test', password: 'WrongPassw0rd!' });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid email and/or password');
  });

  it('logs in regardless of the email case the caller typed', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: '  MEMBER@N10.test ', password: VALID_PASSWORD });

    expect(response.status).toBe(200);
    expect(mockedPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'member@n10.test' },
    });
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'member@n10.test',
      password: 'unused-hash',
      role: 'ADMIN',
    });
  });

  it('rejects a request with no token', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
  });

  it('rejects a malformed token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(response.status).toBe(401);
  });

  it('returns the identity for a valid token', async () => {
    const token = await loginAndGetToken('ADMIN');

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      userId: 'user-1',
      email: 'member@n10.test',
      role: 'ADMIN',
    });
  });
});

describe('requireUser account revalidation', () => {
  it('rejects a still-valid token whose account was deleted', async () => {
    const token = await loginAndGetToken('ADMIN');
    mockedPrisma.user.findUnique.mockResolvedValue(null); // deleted since login

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('uses the current role from the database, not the role baked into the token', async () => {
    const token = await loginAndGetToken('SALES_REP'); // token says SALES_REP
    mockedPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'member@n10.test',
      role: 'ADMIN', // promoted since the token was issued
    });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user.role).toBe('ADMIN');
  });

  it('blocks any protected route when the account no longer exists', async () => {
    const token = await loginAndGetToken('ADMIN');
    mockedPrisma.user.findUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
