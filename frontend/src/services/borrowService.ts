import type { ApiError } from '../types/auth';
import { BorrowRequestError } from '../types/borrow';
import type { BorrowRequest, BorrowRequestFormErrors, BorrowRequestPayload } from '../types/borrow';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const FIELDS = ['equipment_id', 'pickup_date', 'due_date', 'purpose'] as const;

export async function createBorrowRequest(payload: BorrowRequestPayload): Promise<BorrowRequest> {
  const token = document.cookie.split('; ').find(value => value.startsWith('csrftoken='));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-CSRFToken'] = decodeURIComponent(token.slice('csrftoken='.length));

  const response = await fetch(`${baseUrl}/borrow-requests`, {
    method: 'POST', credentials: 'include', headers,
    body: JSON.stringify({ ...payload, purpose: payload.purpose.trim() }),
  });

  if (!response.ok) {
    const data: ApiError | null = await response.json().catch(() => null);
    const fields: BorrowRequestFormErrors = {};
    const details = data?.error?.details;
    if (details && !Array.isArray(details)) {
      for (const field of FIELDS) {
        if (Array.isArray(details[field])) fields[field] = details[field].join(' ');
      }
    }
    throw new BorrowRequestError(
      data?.error?.message || 'Failed to submit borrow request.', response.status, data?.error?.code, fields,
    );
  }
  return response.json();
}
