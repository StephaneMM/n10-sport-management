import bcrypt from 'bcrypt';
import { BCRYPT_COST, hashPassword, needsRehash, verifyPassword } from './password';

describe('password', () => {
  it('hashes at the current cost and round-trips', async () => {
    const hash = await hashPassword('Correct-Horse-1!');
    expect(bcrypt.getRounds(hash)).toBe(BCRYPT_COST);
    expect(await verifyPassword('Correct-Horse-1!', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('flags a weaker hash for rehash and leaves a current one alone', async () => {
    expect(needsRehash(await bcrypt.hash('x', BCRYPT_COST - 2))).toBe(true);
    expect(needsRehash(await bcrypt.hash('x', BCRYPT_COST))).toBe(false);
  });

  it('does not throw on a non-bcrypt string', () => {
    expect(needsRehash('not-a-hash')).toBe(false);
  });
});
