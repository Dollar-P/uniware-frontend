import { addDays, daysBetween, toDateInput } from './dateValidation';

/** The backend stores `due_date` as an exclusive end date: the loan covers every day
 *  before it. The last day the borrower may keep the item is therefore the day before. */
export function lastLoanDay(dueDate: string): string {
  return addDays(dueDate, -1);
}

export type LoanDueKind = 'overdue' | 'due-today' | 'due-soon' | 'on-track';
export interface LoanDueState { kind: LoanDueKind; label: string }

const plural = (count: number) => `${count} day${count === 1 ? '' : 's'}`;

/** US7-1 / US8-1: how close an active loan is to its return deadline. */
export function loanDueState(dueDate: string, today = toDateInput(new Date())): LoanDueState {
  const daysLeft = daysBetween(today, lastLoanDay(dueDate));
  if (daysLeft < 0) return { kind: 'overdue', label: `Overdue by ${plural(-daysLeft)}` };
  if (daysLeft === 0) return { kind: 'due-today', label: 'Due today' };
  if (daysLeft === 1) return { kind: 'due-soon', label: 'Due tomorrow' };
  return { kind: daysLeft <= 3 ? 'due-soon' : 'on-track', label: `Due in ${plural(daysLeft)}` };
}
