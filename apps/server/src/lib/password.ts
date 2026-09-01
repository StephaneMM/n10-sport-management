import bcrypt from 'bcrypt';

/**
 * Current bcrypt work factor. Raise over time as hardware gets faster. Dropped
 * to a cheap value under NODE_ENV=test so the suite doesn't pay ~300ms per hash
 * — tests assert behaviour, not the real cost.
 */
export const BCRYPT_COST = process.env.NODE_ENV === 'test' ? 6 : 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** True when `hash` was produced with a lower cost than we now use. */
export function needsRehash(hash: string): boolean {
  try {
    return bcrypt.getRounds(hash) < BCRYPT_COST;
  } catch {
    return false;
  }
}
