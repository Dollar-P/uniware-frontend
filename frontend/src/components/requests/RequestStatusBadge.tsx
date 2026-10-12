import type { BorrowRequestStatus } from '../../types/borrowRequest';

export default function RequestStatusBadge({ status }: { status: BorrowRequestStatus }) {
  return <span className={`provider-request-status provider-request-status-${status.toLowerCase()}`}>{status.replaceAll('_', ' ')}</span>;
}
