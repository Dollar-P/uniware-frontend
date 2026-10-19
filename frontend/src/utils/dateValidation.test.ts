import { describe, it, expect } from 'vitest';
import { MAX_ADVANCE_DAYS, MAX_LOAN_DAYS, addDays, toDateInput, validateBorrowDates } from './dateValidation';

const today = '2026-10-12';

describe('validateBorrowDates (US4-2)', () => {
  it('accepts a valid range', () => {
    expect(validateBorrowDates('2026-10-13', '2026-10-20', today)).toEqual({});
  });

  it('accepts pickup today and a one-day loan', () => {
    expect(validateBorrowDates(today, '2026-10-13', today)).toEqual({});
  });

  it('requires both dates', () => {
    expect(validateBorrowDates('', '', today)).toEqual({
      pickup_date: 'Please select a pickup date.',
      due_date: 'Please select a due date.',
    });
  });

  it('rejects a pickup date in the past', () => {
    expect(validateBorrowDates('2026-10-11', '2026-10-13', today)).toEqual({
      pickup_date: 'Pickup date cannot be in the past.',
    });
  });

  it.each([['equal to', '2026-10-15'], ['before', '2026-10-14']])('rejects a due date %s the pickup date', (_, due) => {
    expect(validateBorrowDates('2026-10-15', due, today)).toEqual({
      due_date: 'Due date must be after the pickup date.',
    });
  });

  it(`allows a pickup exactly ${MAX_ADVANCE_DAYS} days ahead and rejects one more`, () => {
    const limit = addDays(today, MAX_ADVANCE_DAYS);
    expect(validateBorrowDates(limit, addDays(limit, 1), today)).toEqual({});
    expect(validateBorrowDates(addDays(limit, 1), addDays(limit, 2), today).pickup_date)
      .toBe(`Pickup date must be within ${MAX_ADVANCE_DAYS} days from today.`);
  });

  it(`allows a ${MAX_LOAN_DAYS}-day loan and rejects one more day`, () => {
    expect(validateBorrowDates(today, addDays(today, MAX_LOAN_DAYS), today)).toEqual({});
    expect(validateBorrowDates(today, addDays(today, MAX_LOAN_DAYS + 1), today).due_date)
      .toBe(`A loan can last at most ${MAX_LOAN_DAYS} days.`);
  });

  it('counts days across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(validateBorrowDates('2026-12-20', '2027-01-19', '2026-12-20')).toEqual({});
  });

  it('formats a local calendar day for date inputs', () => {
    expect(toDateInput(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
