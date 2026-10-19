import { useCallback, useEffect, useState } from 'react';
import RequestStatusBadge from '../components/requests/RequestStatusBadge';
import BorrowerRequestActions from '../components/requests/BorrowerRequestActions';
import { getMyBorrowRequest } from '../services/myRequestsApi';
import { dateLabel, MY_REQUEST_STATUS_HELP, MyRequestError } from '../types/borrowRequest';
import type { MyBorrowRequest } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';
import { MyRequestsHeader } from './MyRequestsHeader';
import './ProviderRequests.css';
import './MyRequests.css';

/** US4-3: status detail for one of the borrower's own requests. A request belonging to
 *  someone else is scoped out of the server queryset and answers 404, so "not found" and
 *  "not yours" deliberately look identical here — nothing about it is disclosed. */
export default function MyRequestDetailPage({ user, requestId }: { user: RegisterResponse; requestId: string }) {
  const canBorrow = user.is_borrower && user.account_status === 'ACTIVE';
  const [request, setRequest] = useState<MyBorrowRequest | null>(null);
  const [loading, setLoading] = useState(canBorrow);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [missing, setMissing] = useState(false);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setMissing(false);
    try {
      setRequest(await getMyBorrowRequest(requestId));
      setDenied(false);
    } catch (cause) {
      setRequest(null);
      if (cause instanceof MyRequestError && cause.status === 404) setMissing(true);
      else if (cause instanceof MyRequestError && [401, 403].includes(cause.status)) setDenied(true);
      else setError(cause instanceof Error ? cause.message : 'Unable to load this borrow request.');
    } finally { setLoading(false); }
  }, [requestId]);

  useEffect(() => {
    if (!canBorrow) return;
    // Fetching on navigation is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [canBorrow, load]);

  if (!canBorrow || denied) return (
    <main className="provider-request-page"><MyRequestsHeader />
      <section className="provider-request-panel"><h1>Borrower access required</h1>
        <p>You must be an active borrower to view borrow requests.</p>
        <a href="#account">Back to account</a></section>
    </main>
  );

  return (
    <main className="provider-request-page">
      <MyRequestsHeader />
      <section className="provider-request-panel" aria-labelledby="my-request-detail-title">
        <h1 id="my-request-detail-title">Request details</h1>
        {loading ? <p role="status">Loading this request...</p> : missing ? (
          <div className="provider-request-empty"><h2>Request not found</h2>
            <p>This request does not exist, or it is not one of yours.</p>
            <a className="provider-request-button provider-request-button-primary" href="#my-requests">Back to my requests</a></div>
        ) : error ? (
          <div><p role="alert" className="provider-request-error">{error}</p>
            <button className="provider-request-button" onClick={() => void load()}>Try again</button></div>
        ) : request ? (
          <>
            <div className="provider-request-card-heading">
              <h2>{request.equipment.name}</h2>
              <RequestStatusBadge status={request.status} />
            </div>
            <p className="my-request-status-help">{MY_REQUEST_STATUS_HELP[request.status]}</p>
            <dl className="provider-request-detail-grid">
              <div><dt>Asset ID</dt><dd>{request.equipment.asset_id}</dd></div>
              <div><dt>Model</dt><dd>{request.equipment.model || 'Not specified'}</dd></div>
              <div><dt>Category</dt><dd>{request.equipment.category.name}</dd></div>
              <div><dt>Location</dt><dd>{request.equipment.location.name}</dd></div>
              <div><dt>Pickup date</dt><dd>{dateLabel(request.pickup_date)}</dd></div>
              <div><dt>Return date</dt><dd>{dateLabel(request.due_date)}</dd></div>
              <div className="provider-request-wide"><dt>Purpose</dt><dd>{request.purpose}</dd></div>
              {request.decision_reason && (
                <div className="provider-request-wide"><dt>Reason given by the provider</dt><dd>{request.decision_reason}</dd></div>
              )}
              {request.decided_at && (
                <div><dt>Decided on</dt><dd>{new Date(request.decided_at).toLocaleString('en-GB')}</dd></div>
              )}
            </dl>
            {success && <p role="status" className="provider-request-success">{success}</p>}
            <BorrowerRequestActions key={[request.id, request.status, request.pickup_date, request.due_date, request.purpose].join(':')} request={request} onChanged={(updated, message) => {
              setRequest(updated);
              setSuccess(message);
            }} />
            <a className="provider-request-button" href="#my-requests">Back to my requests</a>
          </>
        ) : null}
      </section>
    </main>
  );
}
