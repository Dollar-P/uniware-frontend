import type { Equipment, Paginated } from './equipment';

/** Shared fields are derived from apps/requests/serializers.py in the backend branch. */
export type BorrowRequestStatus =
  | 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CHECKED_OUT' | 'COMPLETED';

export interface BorrowerInfo {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  department?: string;
}

export interface ProviderBorrowRequest {
  id: string;
  borrower: BorrowerInfo;
  equipment: Equipment;
  pickup_date: string;
  due_date: string; // Exclusive end date in the backend data model.
  purpose: string;
  status: BorrowRequestStatus;
  decision_reason: string;
  decided_by: string | null;
  decided_at: string | null;
}

export type ProviderRequestPage = Paginated<ProviderBorrowRequest>;

/** Backend sometimes sends a borrower UUID; the provider serializer may expand it. */
export type BorrowerWire = string | BorrowerInfo;
export type RequestWire = Omit<ProviderBorrowRequest, 'borrower'> & {
  borrower: BorrowerWire;
};

export class ProviderRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ProviderRequestError';
    this.status = status;
    this.code = code;
  }
}

export function borrowerLabel(person: BorrowerInfo): string {
  const name = [person.first_name, person.last_name].filter(Boolean).join(' ').trim();
  return name || person.email || `Borrower ${person.id.slice(0, 8)}`;
}

export function dateLabel(isoDate: string): string {
  // Date-only strings must not drift across browser time zones.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}
