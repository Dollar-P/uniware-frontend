import { useCallback, useEffect, useState } from 'react';
import LoanDueBadge from '../components/requests/LoanDueBadge';
import { listMyActiveLoans } from '../services/myRequestsApi';
import { dateLabel, MyRequestError } from '../types/borrowRequest';
import type { MyBorrowRequest } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';
import { lastLoanDay } from '../utils/loanDates';
import { MyRequestsHeader } from './MyRequestsHeader';
import './ProviderRequests.css';
import './MyRequests.css';

/** US8-1: equipment the borrower currently holds and when each item is due back.
 *  The server scopes the list to the signed-in borrower's CHECKED_OUT loans. */
export default function MyLoansPage({ user }: { user: RegisterResponse }) {
  const canBorrow = user.is_borrower && user.account_status === 'ACTIVE';
  const [page, setPage] = useState(1);
  const [loans, setLoans] = useState<MyBorrowRequest[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(canBorrow);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await listMyActiveLoans(targetPage);
      setLoans(result.results);
      setCount(result.count);
      setHasNext(Boolean(result.next));
      setDenied(false);
    } catch (cause) {
      setLoans([]);
      if (cause instanceof MyRequestError && [401, 403].includes(cause.status)) setDenied(true);
      else setError(cause instanceof Error ? cause.message : 'Unable to load your active loans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canBorrow) return;
    // The fetch is the intended side effect when the page changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(page);
  }, [canBorrow, load, page]);

  if (!canBorrow || denied) return (
    <main className="provider-request-page"><MyRequestsHeader />
      <section className="provider-request-panel"><h1>Borrower access required</h1>
        <p>You must be an active borrower to view your loans.</p>
        <a href="#account">Back to account</a></section>
    </main>
  );

  return (
    <main className="provider-request-page">
      <MyRequestsHeader />
      <section className="provider-request-panel" aria-labelledby="my-loans-title">
        <header className="provider-request-heading">
          <div><h1 id="my-loans-title">My active loans</h1>
            <p>Equipment you currently hold. Return each item to its location by the date shown.</p></div>
          <span>{count} active loan{count === 1 ? '' : 's'}</span>
        </header>
        <div className="provider-request-tabs" role="group" aria-label="Loan list actions">
          <button type="button" className="provider-request-refresh" disabled={loading} onClick={() => void load(page)}>Refresh</button>
        </div>
        {loading ? <p role="status">Loading your loans...</p> : error ? (
          <div><p role="alert" className="provider-request-error">{error}</p>
            <button className="provider-request-button" onClick={() => void load(page)}>Try again</button></div>
        ) : loans.length === 0 ? (
          <div className="provider-request-empty"><h2>No active loans</h2>
            <p>Equipment you pick up will appear here until the provider confirms its return.</p>
            <a className="provider-request-button provider-request-button-primary" href="#my-requests">View my borrow requests</a></div>
        ) : (
          <ul className="provider-request-list">
            {loans.map(loan => (
              <li key={loan.id} className="provider-request-card">
                <div>
                  <div className="provider-request-card-heading">
                    <h2>{loan.equipment.name}</h2>
                    <LoanDueBadge dueDate={loan.due_date} />
                  </div>
                  <p><strong>Asset ID:</strong> {loan.equipment.asset_id}</p>
                  <p><strong>Pickup date:</strong> {dateLabel(loan.pickup_date)}</p>
                  <p><strong>Return by:</strong> {dateLabel(lastLoanDay(loan.due_date))}</p>
                  <p><strong>Return to:</strong> {loan.equipment.location.name}</p>
                </div>
                <a className="provider-request-button provider-request-button-primary" href={`#my-requests/${encodeURIComponent(loan.id)}`}>View details</a>
              </li>
            ))}
          </ul>
        )}
        {(page > 1 || hasNext) && !loading && !error && (
          <nav className="provider-request-pagination" aria-label="Loan pages">
            <button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button>
            <span>Page {page}</span>
            <button type="button" disabled={!hasNext} onClick={() => setPage(value => value + 1)}>Next</button>
          </nav>
        )}
      </section>
    </main>
  );
}
