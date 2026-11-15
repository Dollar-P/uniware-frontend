import { useState } from 'react';
import { returnProviderRequest } from '../../services/providerRequestsApi';
import ReturnConditionDialog from './ReturnConditionDialog';
import type { ProviderBorrowRequest } from '../../types/borrowRequest';
import { dateLabel } from '../../types/borrowRequest';
import BorrowerName from './BorrowerName';
import RequestStatusBadge from './RequestStatusBadge';
import SuspensionNotice from '../equipment/SuspensionNotice';

export default function RequestCard({ request, onReturned }: {
  request: ProviderBorrowRequest;
  onReturned?: () => void | Promise<void>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function markReturned(condition: string) {
    setBusy(true);
    setError('');
    try {
      await returnProviderRequest(request.id, condition);
      setDialogOpen(false);
      await onReturned?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to record return.'); }
    finally { setBusy(false); }
  }
  return (
    <li className="provider-request-card">
      <div>
        <div className="provider-request-card-heading">
          <h2>{request.equipment.name}</h2>
          <RequestStatusBadge status={request.status} />
        </div>
        <p><strong>Borrower:</strong> <BorrowerName borrower={request.borrower} /></p>
        <p><strong>Period:</strong> {dateLabel(request.pickup_date)} – {dateLabel(request.due_date)} (return date)</p>
        <p><strong>Purpose:</strong> {request.purpose}</p>
        <SuspensionNotice equipment={request.equipment} />
      </div>
      <div className="provider-request-card-actions">
        <a className="provider-request-button provider-request-button-primary" href={`#provider-requests/${encodeURIComponent(request.id)}`}>View details</a>
        {request.status === 'CHECKED_OUT' && (
          <button type="button" className="provider-request-button" onClick={() => { setError(''); setDialogOpen(true); }}>Returned</button>
        )}
        {dialogOpen && <ReturnConditionDialog busy={busy} error={error} onCancel={() => setDialogOpen(false)} onConfirm={condition => void markReturned(condition)} />}
      </div>
    </li>
  );
}
