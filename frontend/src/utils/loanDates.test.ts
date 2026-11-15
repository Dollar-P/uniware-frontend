import { describe, expect, it } from 'vitest';
import { lastLoanDay, loanDueState } from './loanDates';

describe('loan due dates (exclusive backend due_date)', () => {
  it('treats the day before due_date as the last day of the loan', () => {
    expect(lastLoanDay('2026-10-23')).toBe('2026-10-22');
    expect(lastLoanDay('2026-11-01')).toBe('2026-10-31');
    expect(lastLoanDay('2027-01-01')).toBe('2026-12-31');
  });

  it('describes how far away the deadline is', () => {
    const today = '2026-10-20';
    expect(loanDueState('2026-10-28', today)).toEqual({ kind: 'on-track', label: 'Due in 7 days' });
    expect(loanDueState('2026-10-24', today)).toEqual({ kind: 'due-soon', label: 'Due in 3 days' });
    expect(loanDueState('2026-10-22', today)).toEqual({ kind: 'due-soon', label: 'Due tomorrow' });
    expect(loanDueState('2026-10-21', today)).toEqual({ kind: 'due-today', label: 'Due today' });
  });

  it('is overdue from the exclusive due date onwards', () => {
    const due = '2026-10-21';
    expect(loanDueState(due, '2026-10-21')).toEqual({ kind: 'overdue', label: 'Overdue by 1 day' });
    expect(loanDueState(due, '2026-10-25')).toEqual({ kind: 'overdue', label: 'Overdue by 5 days' });
  });
});
