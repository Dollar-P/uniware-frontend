import type { MyBorrowRequest } from '../../types/borrowRequest';
import { dateLabel } from '../../types/borrowRequest';
import RequestStatusBadge from './RequestStatusBadge';
import SuspensionNotice from '../equipment/SuspensionNotice';

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
        <SuspensionNotice equipment={request.equipment} />
      </div>
      <div className="provider-request-card-actions">
        <a className="provider-request-button provider-request-button-primary" href={`#my-requests/${encodeURIComponent(request.id)}`}>View details</a>
        {request.status === 'APPROVED' && <p>The provider confirms handover when you collect the equipment.</p>}
      </div>
    </li>
  );
}
