import { describe, expect, it } from 'vitest';
import { serverToday } from './serverDate';

describe('serverToday', () => {
  it('returns the Bangkok calendar day as yyyy-mm-dd', () => {
    expect(serverToday(new Date('2026-11-16T05:00:00Z'))).toBe('2026-11-16');
  });
  it('rolls over at Bangkok midnight, seven hours before UTC does', () => {
    expect(serverToday(new Date('2026-11-16T16:59:59Z'))).toBe('2026-11-16');
    expect(serverToday(new Date('2026-11-16T17:00:00Z'))).toBe('2026-11-17');
  });
});
