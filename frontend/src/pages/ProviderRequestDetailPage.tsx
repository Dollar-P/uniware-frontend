import { useCallback, useEffect, useRef, useState } from 'react';
import ApproveConfirmDialog from '../components/requests/ApproveConfirmDialog';
import RejectRequestDialog from '../components/requests/RejectRequestDialog';
import RequestStatusBadge from '../components/requests/RequestStatusBadge';
import { approveProviderRequest, getProviderRequest, rejectProviderRequest } from '../services/providerRequestsApi';
import { borrowerLabel, dateLabel, ProviderRequestError } from '../types/borrowRequest';
import type { ProviderBorrowRequest } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';
import { ProviderHeader } from './ProviderRequestsPage';
import './ProviderRequests.css';

type Decision = 'approve' | 'reject' | null;

export default function ProviderRequestDetailPage({ user, requestId }: { user: RegisterResponse; requestId: string }) {
  const canManage = user.is_provider && user.account_status === 'ACTIVE';
  const [request, setRequest] = useState<ProviderBorrowRequest | null>(null);
  const [loading, setLoading] = useState(canManage);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [decision, setDecision] = useState<Decision>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getProviderRequest(requestId);
      setRequest(result);
      setDenied(false);
    } catch (cause) {
      setRequest(null);
      if (cause instanceof ProviderRequestError && [401, 403].includes(cause.status)) setDenied(true);
      else setError(cause instanceof Error ? cause.message : 'Unable to load request details.');
    } finally { setLoading(false); }
  }, [requestId]);

  useEffect(() => {
    if (!canManage) return;
    // Fetching on navigation is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [canManage, load]);

  async function submitDecision(kind: Exclude<Decision, null>, reason = '') {
    if (submittingRef.current || !request || request.status !== 'PENDING') return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const updated = kind === 'approve' ? await approveProviderRequest(request.id) : await rejectProviderRequest(request.id, reason);
      setRequest(updated);
      setDecision(null);
      setNotice(kind === 'approve' ? 'Request approved.' : 'Request rejected.');
      // Refresh from server rather than trusting only an optimistic local state.
      try { setRequest(await getProviderRequest(request.id)); } catch { /* The successful mutation remains visible. */ }
    } catch (cause) {
      if (cause instanceof ProviderRequestError && cause.status === 409) {
        setDecision(null);
        setError('This request can no longer be processed (conflict or changed status). Refresh to see the latest state.');
      } else {
        setError(cause instanceof Error ? cause.message : 'Unable to complete this action.');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (!canManage || denied) return (
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
          {notice && <p role="status" className="provider-request-success">{notice}</p>}
          {error && <p role="alert" className="provider-request-error">{error}</p>}
          <dl className="provider-request-detail-grid">
            <div><dt>Equipment</dt><dd>{request.equipment.name}</dd></div>
            <div><dt>Asset ID</dt><dd>{request.equipment.asset_id}</dd></div>
            <div><dt>Borrower</dt><dd>{borrowerLabel(request.borrower)}</dd></div>
            {request.borrower.email && <div><dt>Borrower email</dt><dd>{request.borrower.email}</dd></div>}
            <div><dt>Pickup date</dt><dd>{dateLabel(request.pickup_date)}</dd></div>
            <div><dt>Return by (exclusive due date)</dt><dd>{dateLabel(request.due_date)}</dd></div>
            <div className="provider-request-wide"><dt>Purpose</dt><dd>{request.purpose}</dd></div>
            {request.decision_reason && <div className="provider-request-wide"><dt>Decision reason</dt><dd>{request.decision_reason}</dd></div>}
          </dl>
          {request.status === 'PENDING' && (
            <div className="provider-request-actions">
              <button type="button" className="provider-request-button provider-request-button-danger" disabled={submitting} onClick={() => { setError(''); setDecision('reject'); }}>Reject</button>
              <button type="button" className="provider-request-button provider-request-button-primary" disabled={submitting} onClick={() => { setError(''); setDecision('approve'); }}>Approve</button>
            </div>
          )}
          <button type="button" className="provider-request-button provider-request-button-refresh" disabled={submitting || loading} onClick={() => void load()}>Refresh status</button>
        </>}
      </section>
      {decision === 'approve' && request?.status === 'PENDING' && (
        <ApproveConfirmDialog busy={submitting} error={error} onCancel={() => setDecision(null)} onConfirm={() => void submitDecision('approve')} />
      )}
      {decision === 'reject' && request?.status === 'PENDING' && (
        <RejectRequestDialog busy={submitting} error={error} onCancel={() => setDecision(null)} onConfirm={reason => void submitDecision('reject', reason)} />
      )}
    </main>
  );
}
