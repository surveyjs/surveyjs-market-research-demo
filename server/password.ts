import { createHash, timingSafeEqual } from 'node:crypto';

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function passwordsMatch(password: string, hash: string): boolean {
  const actual = Buffer.from(hashPassword(password));
  const expected = Buffer.from(hash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
