import type { MyBorrowRequest } from '../../types/borrowRequest';
import { dateLabel } from '../../types/borrowRequest';
import RequestStatusBadge from './RequestStatusBadge';

export default function MyRequestCard({ request }: { request: MyBorrowRequest }) {
  return (
    <li className="provider-request-card">
      <div>
        <div className="provider-request-card-heading">
          <h2>{request.equipment.name}</h2>
          <RequestStatusBadge status={request.status} />
        </div>
        <p><strong>Asset ID:</strong> {request.equipment.asset_id}</p>
        <p><strong>Period:</strong> {dateLabel(request.pickup_date)} – {dateLabel(request.due_date)} (return date)</p>
        <p><strong>Purpose:</strong> {request.purpose}</p>
      </div>
      <a className="provider-request-button provider-request-button-primary" href={`#my-requests/${encodeURIComponent(request.id)}`}>View details</a>
    </li>
  );
}
