import { useState } from 'react';
import type { FormEvent } from 'react';

/** Record the equipment's physical condition at handover; required before marking returned. */
export default function ReturnConditionDialog({ busy, error, onCancel, onConfirm }: {
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (condition: string) => void;
}) {
  const [condition, setCondition] = useState('');
  const trimmed = condition.trim();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (trimmed && !busy && trimmed.length <= 2000) onConfirm(trimmed);
  }
  return (
    <div className="provider-request-overlay">
      <form className="provider-request-dialog" role="dialog" aria-modal="true" aria-label="Record return condition" onSubmit={submit}>
        <h2>Mark equipment as returned</h2>
        <p>Describe the equipment condition when it was returned. The borrower will be able to see this note.</p>
        <label className="provider-request-label" htmlFor="return-condition">Equipment condition on return</label>
        <textarea id="return-condition" rows={4} maxLength={2000} required value={condition} disabled={busy}
          onChange={event => setCondition(event.target.value)} placeholder="e.g. Good condition, no visible damage" />
        {error && <p role="alert" className="provider-request-error">{error}</p>}
        <div className="provider-request-actions">
          <button type="button" className="provider-request-button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="submit" className="provider-request-button provider-request-button-primary" disabled={busy || !trimmed || trimmed.length > 2000}>
            {busy ? 'Saving...' : 'Confirm returned'}
          </button>
        </div>
      </form>
    </div>
  );
}
