import jwt from 'jsonwebtoken';
import { signToken, verifyToken } from './jwt';

const secret = process.env.JWT_SECRET as string;

describe('jwt', () => {
  it('round-trips a signed token', () => {
    const token = signToken({ userId: 'u1', role: 'ADMIN' });
    expect(verifyToken(token)).toMatchObject({ userId: 'u1', role: 'ADMIN' });
  });

  it('rejects a token minted with a different issuer', () => {
    const token = jwt.sign({ userId: 'u1', role: 'ADMIN' }, secret, { issuer: 'someone-else' });
    expect(() => verifyToken(token)).toThrow();
  });

  it('rejects an unsigned (alg: none) token', () => {
    const token = jwt.sign({ userId: 'u1', role: 'ADMIN', iss: 'n10' }, '', { algorithm: 'none' });
    expect(() => verifyToken(token)).toThrow();
  });

  it('rejects an expired token', () => {
    const token = signToken({ userId: 'u1', role: 'ADMIN' }, '-1s');
    expect(() => verifyToken(token)).toThrow();
  });
});
