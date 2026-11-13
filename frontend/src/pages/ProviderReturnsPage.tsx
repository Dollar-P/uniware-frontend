import { useCallback, useEffect, useState } from 'react';
import ConfirmReturnDialog from '../components/requests/ConfirmReturnDialog';
import LoanDueBadge from '../components/requests/LoanDueBadge';
import { confirmProviderReturn, listProviderActiveLoans } from '../services/providerRequestsApi';
import { borrowerLabel, dateLabel, ProviderRequestError } from '../types/borrowRequest';
import type { ProviderBorrowRequest } from '../types/borrowRequest';
import type { RegisterResponse } from '../types/auth';
import { ProviderHeader } from './ProviderRequestsPage';
import './ProviderRequests.css';

/** US7-1: the provider's queue of active (CHECKED_OUT) loans awaiting return. */
export default function ProviderReturnsPage({ user }: { user: RegisterResponse }) {
  const canManage = user.is_provider && user.account_status === 'ACTIVE';
  const [page, setPage] = useState(1);
  const [loans, setLoans] = useState<ProviderBorrowRequest[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(canManage);
  const [error, setError] = useState('');
  const [denied, setDenied] = useState(false);
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const [confirming, setConfirming] = useState<ProviderBorrowRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await listProviderActiveLoans(targetPage);
      setLoans(result.results);
      setCount(result.count);
      setHasNext(Boolean(result.next));
      setDenied(false);
    } catch (cause) {
      setLoans([]);
      if (cause instanceof ProviderRequestError && [401, 403].includes(cause.status)) setDenied(true);
      else setError(cause instanceof Error ? cause.message : 'Unable to load active loans.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManage) return;
    // The fetch is the intended side effect when the page changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(page);
  }, [canManage, load, page]);

  function openConfirm(loan: ProviderBorrowRequest) {
    setConfirmError('');
    setNotice('');
    setSuccess('');
    setConfirming(loan);
  }

  /** The list reflects server state after every attempt, so a returned loan leaves the queue. */
  function reloadAfterChange() {
    if (loans.length === 1 && page > 1) setPage(value => value - 1);
    else void load(page);
  }

  async function confirmReturn() {
    if (!confirming || busy) return;
    setBusy(true);
    setConfirmError('');
    try {
      const updated = await confirmProviderReturn(confirming.id);
      setConfirming(null);
      setSuccess(`${updated.equipment.name} marked as returned. The loan is now completed.`);
      reloadAfterChange();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to confirm this return.';
      if (cause instanceof ProviderRequestError && [401, 403].includes(cause.status)) {
        setConfirming(null);
        setDenied(true);
      } else if (cause instanceof ProviderRequestError && [404, 409].includes(cause.status)) {
        // Already returned (possibly from another tab) or no longer this provider's loan.
        setConfirming(null);
        setNotice(message);
        reloadAfterChange();
      } else {
        setConfirmError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!canManage || denied) return (
    <main className="provider-request-page"><ProviderHeader />
      <section className="provider-request-panel"><h1>Provider access required</h1>
        <p>You must be an active provider to confirm equipment returns.</p>
        <a href="#account">Back to account</a></section>
    </main>
  );

  return (
    <main className="provider-request-page">
      <ProviderHeader />
      <section className="provider-request-panel" aria-labelledby="provider-returns-title">
        <header className="provider-request-heading">
          <div><h1 id="provider-returns-title">Return queue</h1>
            <p>Equipment currently on loan. Confirm a return once the item is back in your hands.</p></div>
          <span>{count} active loan{count === 1 ? '' : 's'}</span>
        </header>
        <div className="provider-request-tabs" role="group" aria-label="Return queue actions">
          <button type="button" className="provider-request-refresh" disabled={loading || busy} onClick={() => void load(page)}>Refresh</button>
        </div>
        {success && <p role="status" className="provider-request-success">{success}</p>}
        {notice && <p role="alert" className="provider-request-error">{notice}</p>}
        {loading ? <p role="status">Loading active loans...</p> : error ? (
          <div><p role="alert" className="provider-request-error">{error}</p>
            <button className="provider-request-button" onClick={() => void load(page)}>Try again</button></div>
        ) : loans.length === 0 ? (
          <div className="provider-request-empty"><h2>No equipment awaiting return</h2>
            <p>Loans that have been checked out to borrowers will appear here.</p></div>
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
                  <p><strong>Borrower:</strong> {borrowerLabel(loan.borrower)}</p>
                  <p><strong>Period:</strong> {dateLabel(loan.pickup_date)} – {dateLabel(loan.due_date)} (exclusive due date)</p>
                </div>
                <div className="provider-request-actions">
                  <a className="provider-request-button" href={`#provider-requests/${encodeURIComponent(loan.id)}`}>View details</a>
                  <button type="button" className="provider-request-button provider-request-button-primary" disabled={busy}
                    aria-label={`Confirm return of ${loan.equipment.name}`} onClick={() => openConfirm(loan)}>Confirm return</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {(page > 1 || hasNext) && !loading && !error && (
          <nav className="provider-request-pagination" aria-label="Return queue pages">
            <button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button>
            <span>Page {page}</span>
            <button type="button" disabled={!hasNext} onClick={() => setPage(value => value + 1)}>Next</button>
          </nav>
        )}
      </section>
      {confirming && (
        <ConfirmReturnDialog loan={confirming} busy={busy} error={confirmError}
          onCancel={() => setConfirming(null)} onConfirm={() => void confirmReturn()} />
      )}
    </main>
  );
}
