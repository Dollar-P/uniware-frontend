import { afterEach, describe, expect, it, vi } from 'vitest';
import { createBorrowRequest } from './borrowService';
import { BorrowRequestError } from '../types/borrow';

const payload = { equipment_id: 'eq-1', pickup_date: '2026-10-13', due_date: '2026-10-15', purpose: '  Lab work  ' };

function respond(body: unknown, status: number) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('borrow request API (US4-1)', () => {
  afterEach(() => { vi.unstubAllGlobals(); document.cookie = 'csrftoken=; Max-Age=0'; });
  it('posts snake_case fields with session cookies and the CSRF token', async () => {
    document.cookie = 'csrftoken=borrow-token';
    const fetchMock = respond({ id: 'req-1', status: 'PENDING' }, 201);
    await expect(createBorrowRequest(payload)).resolves.toMatchObject({ id: 'req-1', status: 'PENDING' });
    expect(fetchMock).toHaveBeenCalledWith('/api/requests/borrow-requests/', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'borrow-token' },
      body: JSON.stringify({ ...payload, purpose: 'Lab work' }),
    });
  });

  it('maps validation details to form fields', async () => {
    respond({ error: { code: 'VALIDATION_ERROR', message: 'Pickup date cannot be in the past.', details: {
      pickup_date: ['Pickup date cannot be in the past.'], purpose: ['This field may not be blank.'],
    } } }, 400);
    const error = await createBorrowRequest(payload).catch(cause => cause);
    expect(error).toBeInstanceOf(BorrowRequestError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR', fields: {
      pickup_date: 'Pickup date cannot be in the past.', purpose: 'This field may not be blank.',
    } });
  });

  it('keeps the conflict message and code for a booking clash', async () => {
    respond({ error: { code: 'BOOKING_CONFLICT', message: 'Already reserved (2026-10-14 to 2026-10-16).', details: null } }, 409);
    await expect(createBorrowRequest(payload)).rejects.toMatchObject({
      status: 409, code: 'BOOKING_CONFLICT', message: 'Already reserved (2026-10-14 to 2026-10-16).', fields: {},
    });
  });

  it('falls back to a generic message when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Server error', { status: 500 })));
    await expect(createBorrowRequest(payload)).rejects.toMatchObject({ status: 500, message: 'Failed to submit borrow request.' });
  });
});
