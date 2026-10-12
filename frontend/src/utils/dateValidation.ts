/** US4-2 date rules. Mirrors validate_request_dates in apps/borrowing/availability.py;
 *  the backend re-checks them and is the source of truth. */
export const MAX_LOAN_DAYS = 30;
export const MAX_ADVANCE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface BorrowDateErrors { pickup_date?: string; due_date?: string }

/** yyyy-mm-dd for a local calendar day, as <input type="date"> uses. */
export function toDateInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

function daysBetween(from: string, to: string): number {
  // Date.UTC avoids a 23/25-hour day across a daylight-saving change.
  const utc = (day: string) => { const [y, m, d] = day.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((utc(to) - utc(from)) / DAY_MS);
}

/** Return every broken date rule by field; an empty object means the dates are valid. */
export function validateBorrowDates(pickupDate: string, dueDate: string, today = toDateInput(new Date())): BorrowDateErrors {
  const errors: BorrowDateErrors = {};
  if (!pickupDate) errors.pickup_date = 'Please select a pickup date.';
  else if (pickupDate < today) errors.pickup_date = 'Pickup date cannot be in the past.';
  else if (daysBetween(today, pickupDate) > MAX_ADVANCE_DAYS) {
    errors.pickup_date = `Pickup date must be within ${MAX_ADVANCE_DAYS} days from today.`;
  }
  if (!dueDate) errors.due_date = 'Please select a due date.';
  else if (pickupDate && dueDate <= pickupDate) errors.due_date = 'Due date must be after the pickup date.';
  else if (pickupDate && daysBetween(pickupDate, dueDate) > MAX_LOAN_DAYS) {
    errors.due_date = `A loan can last at most ${MAX_LOAN_DAYS} days.`;
  }
  return errors;
}
