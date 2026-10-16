import type { ProviderBorrowRequest } from '../../types/borrowRequest';
import { borrowerLabel, dateLabel } from '../../types/borrowRequest';
import RequestStatusBadge from './RequestStatusBadge';

export default function RequestCard({ request }: { request: ProviderBorrowRequest }) {
  return (
    <li className="provider-request-card">
      <div>
        <div className="provider-request-card-heading">
          <h2>{request.equipment.name}</h2>
          <RequestStatusBadge status={request.status} />
        </div>
        <p><strong>Borrower:</strong> {borrowerLabel(request.borrower)}</p>
        <p><strong>Period:</strong> {dateLabel(request.pickup_date)} – {dateLabel(request.due_date)} (return date)</p>
        <p><strong>Purpose:</strong> {request.purpose}</p>
      </div>
      <a className="provider-request-button provider-request-button-primary" href={`#provider-requests/${encodeURIComponent(request.id)}`}>View details</a>
    </li>
  );
}
