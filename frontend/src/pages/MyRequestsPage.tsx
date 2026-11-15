import { useCallback, useEffect, useState } from 'react';
import MyRequestCard from '../components/requests/MyRequestCard';
import { listMyBorrowRequests } from '../services/myRequestsApi';
import { MyRequestError, REQUEST_FILTER_OPTIONS } from '../types/borrowRequest';
import type { MyBorrowRequest, RequestFilter } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';
import { MyRequestsHeader } from './MyRequestsHeader';
import './ProviderRequests.css';
import './MyRequests.css';

/** US4-3: the borrower tracks their own requests. The server scopes the list to the
 *  signed-in user, so this page never filters by borrower itself. */
export default function MyRequestsPage({ user }: { user: RegisterResponse }) {
  const canBorrow = user.is_borrower && user.account_status === 'ACTIVE';
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<RequestFilter>('ALL');
  const [requests, setRequests] = useState<MyBorrowRequest[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(canBorrow);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);

  const load = useCallback(async (targetPage: number, targetFilter: RequestFilter) => {
    setLoading(true);
    setError('');
    try {
      const result = await listMyBorrowRequests(targetPage, targetFilter);
      setRequests(result.results);
      setCount(result.count);
      setHasNext(Boolean(result.next));
      setDenied(false);
    } catch (cause) {
      setRequests([]);
      if (cause instanceof MyRequestError && [401, 403].includes(cause.status)) setDenied(true);
      else setError(cause instanceof Error ? cause.message : 'Unable to load your borrow requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canBorrow) return;
    // The fetch is the intended side effect when the page changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(page, filter);
  }, [canBorrow, load, page, filter]);

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
      <section className="provider-request-panel" aria-labelledby="my-requests-title">
        <header className="provider-request-heading">
          <div><h1 id="my-requests-title">My borrow requests</h1>
            <p>Track each request. Select View details to edit a pending request or cancel an eligible request.</p></div>
          <span>{count} request{count === 1 ? '' : 's'}</span>
        </header>
        <div className="provider-request-tabs" role="group" aria-label="Filter requests">
          {REQUEST_FILTER_OPTIONS.map(option => (
            <button key={option.value} type="button" aria-pressed={filter === option.value}
              onClick={() => { setPage(1); setFilter(option.value); }}>{option.label}</button>
          ))}
          <button type="button" className="provider-request-refresh" disabled={loading} onClick={() => void load(page, filter)}>Refresh</button>
        </div>
        <p className="provider-request-sort-hint">
          Sorted by {filter === 'CHECKED_OUT' || filter === 'RETURNED' ? 'return date' : 'pickup date'} (earliest first)
        </p>
        {loading ? <p role="status">Loading your requests...</p> : error ? (
          <div><p role="alert" className="provider-request-error">{error}</p>
            <button className="provider-request-button" onClick={() => void load(page, filter)}>Try again</button></div>
        ) : requests.length === 0 ? (
          <div className="provider-request-empty"><h2>{filter === 'ALL' ? 'No borrow requests yet' : 'No matching requests'}</h2>
            <p>{filter === 'ALL' ? 'Requests you submit from the equipment catalog will appear here.' : 'Try another status filter or select All.'}</p>
            <a className="provider-request-button provider-request-button-primary" href="#catalog">Browse equipment</a></div>
        ) : <ul className="provider-request-list">{requests.map(request => <MyRequestCard key={request.id} request={request} onCheckedOut={() => load(page, filter)} />)}</ul>}
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
