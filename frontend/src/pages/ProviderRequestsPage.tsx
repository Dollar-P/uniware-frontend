import { useCallback, useEffect, useState } from 'react';
import RequestCard from '../components/requests/RequestCard';
import { listProviderRequests } from '../services/providerRequestsApi';
import { ProviderRequestError } from '../types/borrowRequest';
import type { ProviderBorrowRequest } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import './ProviderRequests.css';

type Filter = 'PENDING' | 'ALL';

export default function ProviderRequestsPage({ user }: { user: RegisterResponse }) {
  const canManage = user.is_provider && user.account_status === 'ACTIVE';
  const [filter, setFilter] = useState<Filter>('PENDING');
  const [page, setPage] = useState(1);
  const [requests, setRequests] = useState<ProviderBorrowRequest[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(canManage);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);

  const load = useCallback(async (targetPage: number, targetFilter: Filter) => {
    setLoading(true);
    setError('');
    try {
      const result = await listProviderRequests(targetPage, targetFilter);
      setRequests(result.results);
      setCount(result.count);
      setHasNext(Boolean(result.next));
      setDenied(false);
    } catch (cause) {
      setRequests([]);
      if (cause instanceof ProviderRequestError && [401, 403].includes(cause.status)) setDenied(true);
      else setError(cause instanceof Error ? cause.message : 'Unable to load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManage) return;
    // The fetch is the intended side effect when page or filter changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(page, filter);
  }, [canManage, load, page, filter]);

  if (!canManage || denied) return (
    <main className="provider-request-page"><ProviderHeader />
      <section className="provider-request-panel"><h1>Provider access required</h1>
        <p>You must be an active provider to view borrowing requests.</p>
        <a href="#account">Back to account</a></section>
    </main>
  );

  return (
    <main className="provider-request-page">
      <ProviderHeader />
      <section className="provider-request-panel" aria-labelledby="provider-inbox-title">
        <header className="provider-request-heading">
          <div><h1 id="provider-inbox-title">Borrow requests</h1>
            <p>Review and approve or reject borrowing requests for the equipment you manage.</p></div>
          <span>{count} request{count === 1 ? '' : 's'}</span>
        </header>
        <div className="provider-request-tabs" role="group" aria-label="Filter requests">
          <button type="button" aria-pressed={filter === 'PENDING'} onClick={() => { setPage(1); setFilter('PENDING'); }}>Pending</button>
          <button type="button" aria-pressed={filter === 'ALL'} onClick={() => { setPage(1); setFilter('ALL'); }}>All</button>
          <button type="button" className="provider-request-refresh" disabled={loading} onClick={() => void load(page, filter)}>Refresh</button>
        </div>
        {loading ? <p role="status">Loading requests...</p> : error ? (
          <div><p role="alert" className="provider-request-error">{error}</p>
            <button className="provider-request-button" onClick={() => void load(page, filter)}>Try again</button></div>
        ) : requests.length === 0 ? (
          <div className="provider-request-empty"><h2>No {filter === 'PENDING' ? 'pending ' : ''}requests</h2>
            <p>New requests for your equipment will appear here.</p></div>
        ) : <ul className="provider-request-list">{requests.map(request => <RequestCard key={request.id} request={request} />)}</ul>}
        {(page > 1 || hasNext) && !loading && !error && (
          <nav className="provider-request-pagination" aria-label="Request pages">
            <button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button>
            <span>Page {page}</span>
            <button type="button" disabled={!hasNext} onClick={() => setPage(value => value + 1)}>Next</button>
          </nav>
        )}
      </section>
    </main>
  );
}

export function ProviderHeader() {
  return <header className="provider-request-header">
    <img src={uniwareLogo} alt="UniWare" className="uniware-logo" />
    <nav aria-label="Provider navigation"><a href="#account">Your account</a><a href="#my-equipment">My equipment</a><a href="#provider-requests">Requests</a></nav>
  </header>;
}
