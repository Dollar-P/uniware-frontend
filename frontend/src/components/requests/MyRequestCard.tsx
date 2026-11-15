import { useState } from 'react';
import { checkoutMyBorrowRequest } from '../../services/myRequestsApi';
import type { MyBorrowRequest } from '../../types/borrowRequest';
import { dateLabel } from '../../types/borrowRequest';
import RequestStatusBadge from './RequestStatusBadge';
import SuspensionNotice from '../equipment/SuspensionNotice';

export default function MyRequestCard({ request, onCheckedOut }: {
  request: MyBorrowRequest;
  onCheckedOut?: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function checkout() {
    setBusy(true);
    setError('');
    try {
      await checkoutMyBorrowRequest(request.id);
      await onCheckedOut?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to check out.');
    } finally { setBusy(false); }
  }
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
        {request.status === 'APPROVED' && !request.equipment.is_suspended && (
          <button type="button" className="provider-request-button" disabled={busy} onClick={() => void checkout()}>
            {busy ? 'Checking out...' : 'Check out'}
          </button>
        )}
        {error && <p role="alert" className="provider-request-error">{error}</p>}
      </div>
    </li>
  );
}
