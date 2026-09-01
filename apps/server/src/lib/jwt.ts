import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';

const ISSUER = 'n10';
const ALGORITHM = 'HS256';
const DEFAULT_EXPIRY = '1d';

export interface TokenClaims {
  userId: string;
  role: Role;
}

/** Signs an access token. Algorithm and issuer are fixed, not caller-supplied. */
export function signToken(claims: TokenClaims, expiresIn: string = DEFAULT_EXPIRY): string {
  return jwt.sign(claims, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    issuer: ISSUER,
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifies a token. Pins the algorithm (so a future dependency change can't
 * reopen `alg` confusion) and the issuer (so a token minted by another system
 * that happens to share the secret is still rejected). Throws on any failure.
 */
export function verifyToken(token: string): TokenClaims {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
  }) as TokenClaims;
}
