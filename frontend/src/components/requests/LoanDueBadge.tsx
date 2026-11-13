import { loanDueState } from '../../utils/loanDates';

export default function LoanDueBadge({ dueDate }: { dueDate: string }) {
  const { kind, label } = loanDueState(dueDate);
  return <span className={`loan-due loan-due-${kind}`}>{label}</span>;
}
