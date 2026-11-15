import { useEffect } from 'react';
import type { ProviderBorrowRequest } from '../../types/borrowRequest';
import { borrowerLabel } from '../../types/borrowRequest';

/** US7-1: a return completes the loan and cannot be undone, so it needs explicit confirmation. */
export default function ConfirmReturnDialog({ loan, busy, error, onCancel, onConfirm }: {
  loan: ProviderBorrowRequest; busy: boolean; error?: string; onCancel: () => void; onConfirm: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel]);

  return (
    <div className="provider-request-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="return-title" className="provider-request-dialog">
        <h2 id="return-title">Confirm equipment return?</h2>
        <p>
          Confirm that <strong>{loan.equipment.name}</strong> ({loan.equipment.asset_id}) has been returned
          by {borrowerLabel(loan.borrower)}. The loan will be marked as completed and this cannot be undone.
        </p>
        {error && <p role="alert" className="provider-request-error">{error}</p>}
        <div className="provider-request-actions">
          <button type="button" className="provider-request-button" disabled={busy} onClick={onCancel}>Cancel</button>
          <button type="button" className="provider-request-button provider-request-button-primary" disabled={busy} onClick={onConfirm}>
            {busy ? 'Confirming...' : 'Confirm return'}
          </button>
        </div>
      </section>
    </div>
  );
}
