import type { ApiError } from '../types/auth';
import type { ProviderBorrowRequest, ProviderRequestPage, RequestWire } from '../types/borrowRequest';
import { ProviderRequestError } from '../types/borrowRequest';
import { normalizePage, normalizeRequest } from './providerRequestsAdapter';

// Backend: apps.requests.urls_provider (SimpleRouter with trailing_slash=False).
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const providerPath = `${baseUrl}/provider/requests`;

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const data: ApiError | null = await response.json().catch(() => null);
    throw new ProviderRequestError(data?.error?.message || fallback, response.status, data?.error?.code);
  }
  return response.json();
}

function csrfHeaders(): Record<string, string> {
  // Django authenticates requests with the session cookie and requires a CSRF token for writes.
  const token = document.cookie.split('; ').find(value => value.startsWith('csrftoken='));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-CSRFToken'] = decodeURIComponent(token.slice('csrftoken='.length));
  return headers;
}

export async function listProviderRequests(page = 1, status = 'PENDING'): Promise<ProviderRequestPage> {
  const search = new URLSearchParams({ page: String(page) });
  if (status !== 'ALL') search.set('status', status);
  const response = await fetch(`${providerPath}?${search}`, { credentials: 'include', cache: 'no-store' });
  const payload = await readJson<{
    count: number; next: string | null; previous: string | null; results: RequestWire[]
  } | RequestWire[]>(response, 'Unable to load borrowing requests.');
  return normalizePage(payload);
}

export async function getProviderRequest(id: string): Promise<ProviderBorrowRequest> {
  const response = await fetch(`${providerPath}/${encodeURIComponent(id)}`, { credentials: 'include', cache: 'no-store' });
  return normalizeRequest(await readJson<RequestWire>(response, 'Unable to load request details.'));
}

/** US5-3. Backend performs the final availability/ownership/state check and can return HTTP 409. */
export async function approveProviderRequest(id: string): Promise<ProviderBorrowRequest> {
  const response = await fetch(`${providerPath}/${encodeURIComponent(id)}/approve`, {
    method: 'POST', credentials: 'include', headers: csrfHeaders(), body: JSON.stringify({}),
  });
  return normalizeRequest(await readJson<RequestWire>(response, 'Unable to approve this request.'));
}

/** US5-4. Django expects {reason: string}; the reason must be nonblank and <=2000 characters. */
export async function rejectProviderRequest(id: string, reason: string): Promise<ProviderBorrowRequest> {
  const response = await fetch(`${providerPath}/${encodeURIComponent(id)}/reject`, {
    method: 'POST', credentials: 'include', headers: csrfHeaders(), body: JSON.stringify({ reason: reason.trim() }),
  });
  return normalizeRequest(await readJson<RequestWire>(response, 'Unable to reject this request.'));
}
