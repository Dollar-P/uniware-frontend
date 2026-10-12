import type { BorrowerWire, ProviderBorrowRequest, ProviderRequestPage, RequestWire } from '../types/borrowRequest';

function normalizeBorrower(borrower: BorrowerWire) {
  return typeof borrower === 'string' ? { id: borrower } : borrower;
}

export function normalizeRequest(raw: RequestWire): ProviderBorrowRequest {
  return { ...raw, borrower: normalizeBorrower(raw.borrower) };
}

/** DRF pagination normally returns {count,next,previous,results}. Accept a bare list for API evolution. */
export function normalizePage(payload: { count: number; next: string | null; previous: string | null; results: RequestWire[] } | RequestWire[]): ProviderRequestPage {
  if (Array.isArray(payload)) {
    return { count: payload.length, next: null, previous: null, results: payload.map(normalizeRequest) };
  }
  return { ...payload, results: payload.results.map(normalizeRequest) };
}
