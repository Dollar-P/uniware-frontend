import { describe, expect, it } from 'vitest';
import { normalizePage, normalizeRequest } from './providerRequestsAdapter';
import { providerRequestFixtures } from '../test/fixtures/providerRequests';

describe('Provider request response adapter', () => {
  it('normalizes borrower UUID from the shared BorrowRequest serializer', () => {
    const result = normalizeRequest({ ...providerRequestFixtures[0], borrower: 'borrower-uuid' });
    expect(result.borrower).toEqual({ id: 'borrower-uuid' });
  });
  it('supports both unpaginated and DRF paginated lists', () => {
    const data = [providerRequestFixtures[0]];
    expect(normalizePage(data).count).toBe(1);
    expect(normalizePage({ results: data, count: 5, next: 'next', previous: null }).next).toBe('next');
  });
});
