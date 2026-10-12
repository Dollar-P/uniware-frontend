import { useEffect, useState } from 'react';

export default function RejectRequestDialog({ busy, error, onCancel, onConfirm }: {
  busy: boolean; error?: string; onCancel: () => void; onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel]);

  return (
    <div className="provider-request-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="reject-title" className="provider-request-dialog">
        <h2 id="reject-title">Reject borrowing request</h2>
        <form onSubmit={event => { event.preventDefault(); if (reason.trim()) onConfirm(reason.trim()); }}>
          {error && <p role="alert" className="provider-request-error">{error}</p>}
          <label className="provider-request-label" htmlFor="reject-reason">Reason for rejection (required)</label>
          <textarea id="reject-reason" value={reason} onChange={event => setReason(event.target.value)} rows={4}
            maxLength={2000} required disabled={busy} placeholder="Explain why this request cannot be approved" />
          <div className="provider-request-actions">
            <button type="button" className="provider-request-button" disabled={busy} onClick={onCancel}>Cancel</button>
            <button type="submit" className="provider-request-button provider-request-button-danger" disabled={busy || !reason.trim()}>
              {busy ? 'Rejecting...' : 'Confirm rejection'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
