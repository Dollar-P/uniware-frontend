import type { BorrowerInfo } from '../../types/borrowRequest';
import { borrowerLabel } from '../../types/borrowRequest';

export default function BorrowerName({ borrower }: { borrower: BorrowerInfo }) {
  const suspended = borrower.account_status === 'SUSPENDED';
  return <span className={suspended ? 'provider-request-borrower-suspended' : undefined}>
    {borrowerLabel(borrower)}{suspended ? ' (suspended)' : ''}
  </span>;
}
