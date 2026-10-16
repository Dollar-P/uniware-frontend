import { useEffect, useState } from 'react';
import type { AdminEquipment } from '../../types/equipment';

/** US8-4: an admin must say why a listing is leaving the catalog, so the reason is
 *  required here as well as server-side. */
export default function DisableListingDialog({ equipment, busy, error, onCancel, onConfirm }: {
  equipment: AdminEquipment; busy: boolean; error?: string;
  onCancel: () => void; onConfirm: (reason: string) => void;
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
      <section role="dialog" aria-modal="true" aria-labelledby="disable-title" className="provider-request-dialog">
        <h2 id="disable-title">Disable listing</h2>
        <p>
          <strong>{equipment.name}</strong> ({equipment.asset_id}) will no longer appear to
          borrowers. The record is kept, so you can re-enable it later.
        </p>
        <form onSubmit={event => { event.preventDefault(); if (reason.trim()) onConfirm(reason.trim()); }}>
          {error && <p role="alert" className="provider-request-error">{error}</p>}
          <label className="provider-request-label" htmlFor="disable-reason">Reason (required)</label>
          <textarea id="disable-reason" value={reason} onChange={event => setReason(event.target.value)} rows={4}
            maxLength={1000} required disabled={busy}
            placeholder="Explain what is inappropriate or misleading about this listing" />
          <div className="provider-request-actions">
            <button type="button" className="provider-request-button" disabled={busy} onClick={onCancel}>Cancel</button>
            <button type="submit" className="provider-request-button provider-request-button-danger"
              disabled={busy || !reason.trim()}>
              {busy ? 'Disabling...' : 'Confirm disable'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
