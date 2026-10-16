import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMyBorrowRequest, listMyBorrowRequests } from './myRequestsApi';
import { MyRequestError } from '../types/borrowRequest';

const page = { count: 0, next: null, previous: null, results: [] };

describe('US4-3 my borrow requests API', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('asks the server-scoped /mine endpoint and sends session cookies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(page)));
    vi.stubGlobal('fetch', fetchMock);
    await listMyBorrowRequests(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/requests/borrow-requests/mine/?page=2', {
      credentials: 'include', cache: 'no-store',
    });
  });

  it('never passes a borrower id: scoping is the server\'s job', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(page)));
    vi.stubGlobal('fetch', fetchMock);
    await listMyBorrowRequests();
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/requests/borrow-requests/mine/?page=1');
    expect(url).not.toMatch(/borrower/);
  });

  it('accepts a bare list as well as a DRF page', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 'r1' }]))));
    const result = await listMyBorrowRequests();
    expect(result).toMatchObject({ count: 1, next: null, previous: null });
    expect(result.results).toHaveLength(1);
  });

  it('encodes a detail ID as one URL segment and keeps the trailing slash', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'a/b' })));
    vi.stubGlobal('fetch', fetchMock);
    await getMyBorrowRequest('a/b');
    expect(fetchMock).toHaveBeenCalledWith('/api/requests/borrow-requests/a%2Fb/', {
      credentials: 'include', cache: 'no-store',
    });
  });

  it('turns the error envelope into a MyRequestError with status and code', async () => {
    // A Response body can only be read once, so build a fresh one per call.
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      error: { code: 'NOT_FOUND', message: 'No BorrowRequest matches the given query.' },
    }), { status: 404 }))));
    await expect(getMyBorrowRequest('someone-elses-id')).rejects.toBeInstanceOf(MyRequestError);
    await expect(getMyBorrowRequest('someone-elses-id')).rejects.toMatchObject({
      status: 404, code: 'NOT_FOUND', message: 'No BorrowRequest matches the given query.',
    });
  });

  it('treats the id "mine" as not found instead of rendering the list envelope', async () => {
    // The list-level `mine` action shares the detail prefix and matches first, so this
    // URL answers 200 with {count,results} — the detail page must not accept that.
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      count: 1, next: null, previous: null, results: [{ id: 'r1' }],
    })))));
    await expect(getMyBorrowRequest('mine')).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('rejects any 200 body that is not a single request', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify([{ id: 'r1' }])))));
    await expect(getMyBorrowRequest('weird')).rejects.toMatchObject({ status: 404 });
  });

  it('falls back to a readable message when the body is not the envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>502</html>', { status: 502 })));
    await expect(listMyBorrowRequests()).rejects.toMatchObject({
      status: 502, message: 'Unable to load your borrow requests. Please try again.',
    });
  });
});
