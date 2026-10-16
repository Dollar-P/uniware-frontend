import type { ApiError } from '../types/auth';
import type { MyBorrowRequest, MyBorrowRequestPage } from '../types/borrowRequest';
import { MyRequestError } from '../types/borrowRequest';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
// apps/requests/urls.py registers a slash-bearing DefaultRouter, unlike the equipment
// router. Keeping the trailing slash avoids an APPEND_SLASH redirect.
const requestsPath = `${baseUrl}/requests/borrow-requests`;

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) {
    const data: ApiError | null = await response.json().catch(() => null);
    throw new MyRequestError(data?.error?.message || fallback, response.status, data?.error?.code);
  }
  return response.json();
}

/** DRF paginates with {count,next,previous,results}; accept a bare list for API evolution. */
function normalizePage(payload: MyBorrowRequestPage | MyBorrowRequest[]): MyBorrowRequestPage {
  if (Array.isArray(payload)) return { count: payload.length, next: null, previous: null, results: payload };
  return payload;
}

/** US4-3: every borrow request made by the signed-in borrower.
 *  The server scopes this to request.user, so there is no borrower parameter to pass. */
export async function listMyBorrowRequests(page = 1): Promise<MyBorrowRequestPage> {
  const response = await fetch(`${requestsPath}/mine/?page=${page}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return normalizePage(await readJson<MyBorrowRequestPage | MyBorrowRequest[]>(response, 'Unable to load your borrow requests. Please try again.'));
}

/** US4-3: one of the borrower's own requests. Another borrower's id is scoped out of the
 *  queryset server-side and comes back 404, so the UI must not treat it as a crash. */
export async function getMyBorrowRequest(id: string): Promise<MyBorrowRequest> {
  const response = await fetch(`${requestsPath}/${encodeURIComponent(id)}/`, {
    credentials: 'include',
    cache: 'no-store',
  });
  const payload = await readJson<MyBorrowRequest>(response, 'Unable to load this borrow request. Please try again.');
  // The router registers the list-level `mine` action under this same prefix and matches
  // it before the detail route, so the id "mine" answers 200 with a page envelope rather
  // than 404. Anything that is not a single request is a request we do not have.
  if (!payload || typeof payload.id !== 'string') {
    throw new MyRequestError('This borrow request does not exist.', 404, 'NOT_FOUND');
  }
  return payload;
}
