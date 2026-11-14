import { useCallback, useEffect, useState } from 'react';
import ApproveConfirmDialog from '../components/requests/ApproveConfirmDialog';
import RejectRequestDialog from '../components/requests/RejectRequestDialog';
import RequestStatusBadge from '../components/requests/RequestStatusBadge';
import BorrowerName from '../components/requests/BorrowerName';
import ReturnConditionDialog from '../components/requests/ReturnConditionDialog';
import { approveProviderRequest, getProviderRequest, rejectProviderRequest, returnProviderRequest } from '../services/providerRequestsApi';
import { dateLabel, ProviderRequestError } from '../types/borrowRequest';
import type { ProviderBorrowRequest } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';
import { ProviderHeader } from './ProviderRequestsPage';
import './ProviderRequests.css';

type Decision = 'approve' | 'reject' | null;

/** US5-2/3/4: Provider may decide only on PENDING requests belonging to their equipment. */
export default function ProviderRequestDetailPage({ user, requestId }: { user: RegisterResponse; requestId: string }) {
  const canView = user.is_provider && user.account_status === 'ACTIVE';
  const [request, setRequest] = useState<ProviderBorrowRequest | null>(null);
  const [loading, setLoading] = useState(canView);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [denied, setDenied] = useState(false);
  const [decision, setDecision] = useState<Decision>(null);
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [returnOpen, setReturnOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await getProviderRequest(requestId);
      setRequest(result);
      setDenied(false);
    } catch (cause) {
      setRequest(null);
      if (cause instanceof ProviderRequestError && [401, 403].includes(cause.status)) setDenied(true);
      else setError(cause instanceof Error ? cause.message : 'Unable to load request details.');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (!canView) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [canView, load]);

  function openDecision(next: Exclude<Decision, null>) {
    setDecisionError('');
    setError('');
    setSuccess('');
    setDecision(next);
  }

  async function decide(action: Exclude<Decision, null>, reason?: string) {
    if (!request || request.status !== 'PENDING' || decisionBusy ||
      (action === 'approve' && request.borrower.account_status === 'SUSPENDED')) return;
    setDecisionBusy(true);
    setDecisionError('');
    try {
      const updated = action === 'approve'
        ? await approveProviderRequest(requestId)
        : await rejectProviderRequest(requestId, reason || '');
      setRequest(updated);
      setDecision(null);
      setSuccess(action === 'approve'
        ? 'Request approved. The equipment is reserved for the requested dates.'
        : 'Request rejected. The borrower can now see your reason.');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to process this request.';
      if (cause instanceof ProviderRequestError && [401, 403].includes(cause.status)) {
        setDecision(null);
        setDenied(true);
      } else if (cause instanceof ProviderRequestError && cause.status === 409) {
        // Someone may have decided the request while the dialog was open; fetch its current status.
        setDecision(null);
        setError(message);
        try {
          setRequest(await getProviderRequest(requestId));
        } catch (refreshError) {
          if (refreshError instanceof ProviderRequestError && [401, 403].includes(refreshError.status)) setDenied(true);
        }
      } else {
        setDecisionError(message);
      }
    } finally {
      setDecisionBusy(false);
    }
  }

  async function markReturned(condition: string) {
    if (!request || request.status !== 'CHECKED_OUT' || decisionBusy) return;
    setDecisionBusy(true);
    setDecisionError('');
    setError('');
    try {
      setRequest(await returnProviderRequest(request.id, condition));
      setReturnOpen(false);
      setSuccess('Equipment marked returned. The return condition is now visible to the borrower.');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to record return.';
      if (cause instanceof ProviderRequestError && [401, 403].includes(cause.status)) {
        setReturnOpen(false);
        setDenied(true);
      } else if (cause instanceof ProviderRequestError && cause.status === 409) {
        setReturnOpen(false);
        setError(message);
        try { setRequest(await getProviderRequest(requestId)); } catch { /* user can refresh */ }
      } else setDecisionError(message);
    } finally { setDecisionBusy(false); }
  }

  if (!canView || denied) return (
    <main className="provider-request-page"><ProviderHeader />
      <section className="provider-request-panel"><h1>Provider access required</h1>
        <p>Your account cannot access this request.</p><a href="#provider-requests">Back to requests</a></section>
    </main>
  );

  return (
    <main className="provider-request-page">
      <ProviderHeader />
      <section className="provider-request-panel" aria-labelledby="request-detail-title">
        <a href="#provider-requests">← Back to requests</a>
        <header className="provider-request-heading"><h1 id="request-detail-title">Request details</h1>
          {request && <RequestStatusBadge status={request.status} />}</header>
        {loading ? <p role="status">Loading request details...</p> : !request ? (
          <div><p role="alert" className="provider-request-error">{error || 'Request not found.'}</p>
            <button className="provider-request-button" onClick={() => void load()}>Try again</button></div>
        ) : <>
          {error && <p role="alert" className="provider-request-error">{error}</p>}
          {success && <p role="status" className="provider-request-success">{success}</p>}
          <dl className="provider-request-detail-grid">
            <div><dt>Equipment</dt><dd>{request.equipment.name}</dd></div>
            <div><dt>Asset ID</dt><dd>{request.equipment.asset_id}</dd></div>
            <div><dt>Borrower</dt><dd><BorrowerName borrower={request.borrower} /></dd></div>
            {request.borrower.email && <div><dt>Borrower email</dt><dd>{request.borrower.email}</dd></div>}
            <div><dt>Pickup date</dt><dd>{dateLabel(request.pickup_date)}</dd></div>
            <div><dt>Return by (exclusive due date)</dt><dd>{dateLabel(request.due_date)}</dd></div>
            <div className="provider-request-wide"><dt>Purpose</dt><dd>{request.purpose}</dd></div>
            {request.return_condition && (
              <div className="provider-request-wide"><dt>Equipment condition on return</dt><dd>{request.return_condition}</dd></div>
            )}
            {request.returned_at && (
              <div><dt>Returned on</dt><dd>{new Date(request.returned_at).toLocaleString('en-GB')}</dd></div>
            )}
            {request.decision_reason && <div className="provider-request-wide"><dt>Decision reason</dt><dd>{request.decision_reason}</dd></div>}
          </dl>
          {request.status === 'PENDING' && request.borrower.account_status === 'SUSPENDED' && (
            <p className="provider-request-error" role="status">Approval is unavailable while the borrower account is suspended.</p>
          )}
          {request.status === 'PENDING' && (
            <div className="provider-request-actions" aria-label="Request decision actions">
              {request.borrower.account_status !== 'SUSPENDED' && (
                <button type="button" className="provider-request-button provider-request-button-primary" disabled={decisionBusy} onClick={() => openDecision('approve')}>Approve</button>
              )}
              <button type="button" className="provider-request-button provider-request-button-danger" disabled={decisionBusy} onClick={() => openDecision('reject')}>Reject</button>
            </div>
          )}
          {request.status === 'CHECKED_OUT' && (
            <button type="button" className="provider-request-button provider-request-button-primary provider-request-button-refresh"
              disabled={decisionBusy} onClick={() => { setDecisionError(''); setReturnOpen(true); }}>Returned</button>
          )}
          <button type="button" className="provider-request-button provider-request-button-refresh" disabled={loading || decisionBusy} onClick={() => void load()}>Refresh status</button>
        </>}
      </section>
      {returnOpen && request?.status === 'CHECKED_OUT' && (
        <ReturnConditionDialog busy={decisionBusy} error={decisionError} onCancel={() => setReturnOpen(false)}
          onConfirm={condition => void markReturned(condition)} />
      )}
      {decision === 'approve' && request?.status === 'PENDING' && request.borrower.account_status !== 'SUSPENDED' && (
        <ApproveConfirmDialog busy={decisionBusy} error={decisionError} onCancel={() => setDecision(null)} onConfirm={() => void decide('approve')} />
      )}
      {decision === 'reject' && request?.status === 'PENDING' && (
        <RejectRequestDialog busy={decisionBusy} error={decisionError} onCancel={() => setDecision(null)} onConfirm={reason => void decide('reject', reason)} />
      )}
    </main>
  );
}
