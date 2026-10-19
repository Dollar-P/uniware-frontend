import type { ApiError } from '../types/auth';
import type { ProviderBorrowRequest, ProviderRequestPage, RequestWire } from '../types/borrowRequest';
import { ProviderRequestError } from '../types/borrowRequest';
import { providerRequestFixtures } from '../test/fixtures/providerRequests';
import { normalizePage, normalizeRequest } from './providerRequestsAdapter';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const isMock = import.meta.env.VITE_PROVIDER_REQUESTS_MOCK === 'true';
// Read-only provider request API backed by apps.requests.urls_provider.
const providerPath = `${baseUrl}/provider/requests`;

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const data: ApiError | null = await response.json().catch(() => null);
    throw new ProviderRequestError(data?.error?.message || fallback, response.status, data?.error?.code);
  }
  return response.json();
}

// Mock lives behind the same API surface as real fetch; state is in-memory per browser tab.
const mockData: ProviderBorrowRequest[] = structuredClone(providerRequestFixtures);
export function resetProviderRequestsMockForTests(): void {
  mockData.splice(0, mockData.length, ...structuredClone(providerRequestFixtures));
}

async function mockList(page: number, status: string): Promise<ProviderRequestPage> {
  const subset = mockData.filter(item => status === 'ALL' || item.status === status);
  const pageSize = 10;
  const start = (page - 1) * pageSize;
  return { count: subset.length, next: start + pageSize < subset.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null, results: subset.slice(start, start + pageSize) };
}

async function mockDetail(id: string): Promise<ProviderBorrowRequest> {
  const item = mockData.find(request => request.id === id);
  if (!item) throw new ProviderRequestError('Request not found.', 404);
  return structuredClone(item);
}

export async function listProviderRequests(page = 1, status = 'PENDING'): Promise<ProviderRequestPage> {
  if (isMock) return mockList(page, status);
  const search = new URLSearchParams({ page: String(page) });
  if (status !== 'ALL') search.set('status', status);
  const response = await fetch(`${providerPath}?${search}`, { credentials: 'include', cache: 'no-store' });
  const payload = await readJson<{ count: number; next: string | null; previous: string | null; results: RequestWire[] } | RequestWire[]>(response, 'Unable to load borrowing requests.');
  return normalizePage(payload);
}

export async function getProviderRequest(id: string): Promise<ProviderBorrowRequest> {
  if (isMock) return mockDetail(id);
  const response = await fetch(`${providerPath}/${encodeURIComponent(id)}`, { credentials: 'include', cache: 'no-store' });
  return normalizeRequest(await readJson<RequestWire>(response, 'Unable to load request details.'));
}

