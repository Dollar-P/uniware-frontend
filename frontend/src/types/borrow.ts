import type { BorrowRequestStatus } from './borrowRequest';

/** Write shape for POST /borrow-requests (apps/borrowing/serializers.py). */
export interface BorrowRequestPayload {
  equipment_id: string;
  pickup_date: string;
  due_date: string; // Exclusive end date: the item is due back on this day.
  purpose: string;
}

export interface BorrowRequest {
  id: string;
  equipment: { id: string; asset_id: string; name: string };
  borrower: string;
  pickup_date: string;
  due_date: string;
  purpose: string;
  status: BorrowRequestStatus;
  decision_reason: string;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
}

export type BorrowRequestFormErrors = Partial<Record<keyof BorrowRequestPayload, string>>;

/** A message for the banner plus per-field messages, like EquipmentError. */
export class BorrowRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields: BorrowRequestFormErrors;
  constructor(message: string, status: number, code?: string, fields: BorrowRequestFormErrors = {}) {
    super(message);
    this.name = 'BorrowRequestError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
