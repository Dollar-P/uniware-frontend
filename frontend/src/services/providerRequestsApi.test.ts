import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { providerRequestFixtures } from '../test/fixtures/providerRequests';
import { ProviderRequestError } from '../types/borrowRequest';
import { approveProviderRequest, getProviderRequest, listProviderRequests, rejectProviderRequest } from './providerRequestsApi';

const fixture = providerRequestFixtures[0];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  document.cookie = 'csrftoken=test-csrf-value; path=/';
});

afterEach(() => vi.unstubAllGlobals());

describe('Provider Requests HTTP contract with Django backend', () => {
  it('GETs paginated pending requests from slashless provider endpoint', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ count: 1, next: null, previous: null, results: [fixture] }));
    const result = await listProviderRequests(1, 'PENDING');
    expect(result.results[0].id).toBe(fixture.id);
    expect(fetch).toHaveBeenCalledWith('/api/provider/requests?page=1&status=PENDING', {
      credentials: 'include', cache: 'no-store',
    });
  });

  it('GETs a detail by UUID and normalizes borrower', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ...fixture, borrower: 'borrower-uuid' }));
    const result = await getProviderRequest(fixture.id);
    expect(result.borrower.id).toBe('borrower-uuid');
    expect(fetch).toHaveBeenCalledWith(`/api/provider/requests/${fixture.id}`, {
      credentials: 'include', cache: 'no-store',
    });
  });

  it('POSTs approval without a trailing slash with session and CSRF', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ...fixture, status: 'APPROVED' }));
    const result = await approveProviderRequest(fixture.id);
    expect(result.status).toBe('APPROVED');
    expect(fetch).toHaveBeenCalledWith(`/api/provider/requests/${fixture.id}/approve`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'test-csrf-value' },
      body: '{}',
    });
  });

  it('POSTs trimmed rejection reason in the backend reason field', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ...fixture, status: 'REJECTED', decision_reason: 'Maintenance' }));
    const result = await rejectProviderRequest(fixture.id, '  Maintenance  ');
    expect(result.decision_reason).toBe('Maintenance');
    expect(fetch).toHaveBeenCalledWith(`/api/provider/requests/${fixture.id}/reject`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'test-csrf-value' },
      body: '{"reason":"Maintenance"}',
    });
  });

  it('preserves backend 409 BOOKING_CONFLICT error code and message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: { code: 'BOOKING_CONFLICT', message: 'Equipment is no longer available.' } }, 409));
    await expect(approveProviderRequest(fixture.id)).rejects.toMatchObject({
      name: 'ProviderRequestError', status: 409, code: 'BOOKING_CONFLICT', message: 'Equipment is no longer available.',
    } satisfies Partial<ProviderRequestError>);
  });

  it('preserves backend 400 validation errors for missing rejection reason', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: { code: 'VALIDATION_ERROR', message: 'This field may not be blank.' } }, 400));
    await expect(rejectProviderRequest(fixture.id, '  ')).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
  });
});
