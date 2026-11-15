import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { providerRequestFixtures } from '../test/fixtures/providerRequests';
import { ProviderRequestError } from '../types/borrowRequest';
import { approveProviderRequest, confirmProviderReturn, getProviderRequest, listProviderActiveLoans, listProviderRequests, rejectProviderRequest } from './providerRequestsApi';

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

describe('US7-1 return HTTP contract', () => {
  it('GETs the provider-scoped CHECKED_OUT loans as the active loans awaiting return', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ count: 0, next: null, previous: null, results: [] }));
    await listProviderActiveLoans(2);
    expect(fetch).toHaveBeenCalledWith('/api/provider/requests?page=2&status=CHECKED_OUT', {
      credentials: 'include', cache: 'no-store',
    });
  });

  it('POSTs the confirm-return action with session and CSRF and returns the completed loan', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({
      ...fixture, borrower: 'borrower-uuid', status: 'COMPLETED', returned_at: '2026-10-23T10:00:00Z',
    }));
    const result = await confirmProviderReturn(fixture.id);
    expect(result).toMatchObject({ status: 'COMPLETED', returned_at: '2026-10-23T10:00:00Z', borrower: { id: 'borrower-uuid' } });
    expect(fetch).toHaveBeenCalledWith(`/api/provider/requests/${fixture.id}/return`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'test-csrf-value' },
      body: '{}',
    });
  });

  it('preserves a 409 for a duplicate return or invalid state', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: { code: 'INVALID_STATE_TRANSITION', message: 'This loan has already been returned.' } }, 409));
    await expect(confirmProviderReturn(fixture.id)).rejects.toMatchObject({
      name: 'ProviderRequestError', status: 409, code: 'INVALID_STATE_TRANSITION', message: 'This loan has already been returned.',
    });
  });

  it('preserves a 403 for a provider who does not own the equipment', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: { code: 'PERMISSION_DENIED', message: 'Forbidden' } }, 403));
    await expect(confirmProviderReturn(fixture.id)).rejects.toMatchObject({ status: 403, code: 'PERMISSION_DENIED' });
  });
});
