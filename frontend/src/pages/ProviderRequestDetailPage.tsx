import { useCallback, useEffect, useState } from 'react';
import ApproveConfirmDialog from '../components/requests/ApproveConfirmDialog';
import ConfirmReturnDialog from '../components/requests/ConfirmReturnDialog';
import LoanDueBadge from '../components/requests/LoanDueBadge';
import RejectRequestDialog from '../components/requests/RejectRequestDialog';
import RequestStatusBadge from '../components/requests/RequestStatusBadge';
import { approveProviderRequest, confirmProviderReturn, getProviderRequest, rejectProviderRequest } from '../services/providerRequestsApi';
import { borrowerLabel, dateLabel, ProviderRequestError } from '../types/borrowRequest';
import type { ProviderBorrowRequest } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';
import { ProviderHeader } from './ProviderRequestsPage';
import './ProviderRequests.css';

type Decision = 'approve' | 'reject' | 'return' | null;

const REQUIRED_STATUS = { approve: 'PENDING', reject: 'PENDING', return: 'CHECKED_OUT' } as const;
const SUCCESS_MESSAGE = {
  approve: 'Request approved. The equipment is reserved for the requested dates.',
  reject: 'Request rejected. The borrower can now see your reason.',
  return: 'Return confirmed. The loan is now completed.',
} as const;

/** US5-2/3/4: Provider may decide only on PENDING requests belonging to their equipment.
 *  US7-1: Provider may confirm the return of a CHECKED_OUT loan for their equipment. */
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
    if (!request || request.status !== REQUIRED_STATUS[action] || decisionBusy) return;
    setDecisionBusy(true);
    setDecisionError('');
    try {
      const updated = action === 'approve'
        ? await approveProviderRequest(requestId)
        : action === 'reject'
          ? await rejectProviderRequest(requestId, reason || '')
          : await confirmProviderReturn(requestId);
      setRequest(updated);
      setDecision(null);
      setSuccess(SUCCESS_MESSAGE[action]);
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
            <div><dt>Borrower</dt><dd>{borrowerLabel(request.borrower)}</dd></div>
            {request.borrower.email && <div><dt>Borrower email</dt><dd>{request.borrower.email}</dd></div>}
            <div><dt>Pickup date</dt><dd>{dateLabel(request.pickup_date)}</dd></div>
            <div><dt>Return by (exclusive due date)</dt><dd>{dateLabel(request.due_date)}
              {request.status === 'CHECKED_OUT' && <> <LoanDueBadge dueDate={request.due_date} /></>}</dd></div>
            <div className="provider-request-wide"><dt>Purpose</dt><dd>{request.purpose}</dd></div>
            {request.decision_reason && <div className="provider-request-wide"><dt>Decision reason</dt><dd>{request.decision_reason}</dd></div>}
            {request.returned_at && <div><dt>Returned on</dt><dd>{new Date(request.returned_at).toLocaleString('en-GB')}</dd></div>}
          </dl>
          {request.status === 'PENDING' && (
            <div className="provider-request-actions" aria-label="Request decision actions">
              <button type="button" className="provider-request-button provider-request-button-primary" disabled={decisionBusy} onClick={() => openDecision('approve')}>Approve</button>
              <button type="button" className="provider-request-button provider-request-button-danger" disabled={decisionBusy} onClick={() => openDecision('reject')}>Reject</button>
            </div>
          )}
          {request.status === 'CHECKED_OUT' && (
            <div className="provider-request-actions" aria-label="Loan return actions">
              <button type="button" className="provider-request-button provider-request-button-primary" disabled={decisionBusy} onClick={() => openDecision('return')}>Confirm return</button>
            </div>
          )}
          <button type="button" className="provider-request-button provider-request-button-refresh" disabled={loading || decisionBusy} onClick={() => void load()}>Refresh status</button>
        </>}
      </section>
      {decision === 'approve' && request?.status === 'PENDING' && (
        <ApproveConfirmDialog busy={decisionBusy} error={decisionError} onCancel={() => setDecision(null)} onConfirm={() => void decide('approve')} />
      )}
      {decision === 'reject' && request?.status === 'PENDING' && (
        <RejectRequestDialog busy={decisionBusy} error={decisionError} onCancel={() => setDecision(null)} onConfirm={reason => void decide('reject', reason)} />
      )}
      {decision === 'return' && request?.status === 'CHECKED_OUT' && (
        <ConfirmReturnDialog loan={request} busy={decisionBusy} error={decisionError} onCancel={() => setDecision(null)} onConfirm={() => void decide('return')} />
      )}
    </main>
  );
}
