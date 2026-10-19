import { useCallback, useEffect, useState } from 'react';
import RequestStatusBadge from '../components/requests/RequestStatusBadge';
import { getProviderRequest } from '../services/providerRequestsApi';
import { borrowerLabel, dateLabel, ProviderRequestError } from '../types/borrowRequest';
import type { ProviderBorrowRequest } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';
import { ProviderHeader } from './ProviderRequestsPage';
import './ProviderRequests.css';

/** Provider request details are read-only until the request approval story is implemented. */
export default function ProviderRequestDetailPage({ user, requestId }: { user: RegisterResponse; requestId: string }) {
  const canView = user.is_provider && user.account_status === 'ACTIVE';
  const [request, setRequest] = useState<ProviderBorrowRequest | null>(null);
  const [loading, setLoading] = useState(canView);
  const [error, setError] = useState('');
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
    if (!canView) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [canView, load]);

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
          <p>Request approval and rejection are not available yet. You can view request details below.</p>
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
          <button type="button" className="provider-request-button provider-request-button-refresh" disabled={loading} onClick={() => void load()}>Refresh status</button>
        </>}
      </section>
    </main>
  );
}
