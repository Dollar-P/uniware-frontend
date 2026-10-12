import { useEffect } from 'react';

export default function ApproveConfirmDialog({ busy, error, onCancel, onConfirm }: {
  busy: boolean; error?: string; onCancel: () => void; onConfirm: () => void;
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
      <section role="dialog" aria-modal="true" aria-labelledby="approve-title" className="provider-request-dialog">
        <h2 id="approve-title">Approve borrowing request?</h2>
        <p>The backend will verify availability and ownership before confirming the booking.</p>
        {error && <p role="alert" className="provider-request-error">{error}</p>}
        <div className="provider-request-actions">
          <button type="button" className="provider-request-button" disabled={busy} onClick={onCancel}>Cancel</button>
          <button type="button" className="provider-request-button provider-request-button-primary" disabled={busy} onClick={onConfirm}>
            {busy ? 'Approving...' : 'Confirm approval'}
          </button>
        </div>
      </section>
    </div>
  );
}
