import { useState } from 'react';
import type { FormEvent } from 'react';
import { cancelMyBorrowRequest, updateMyBorrowRequest } from '../../services/myRequestsApi';
import { MyRequestError } from '../../types/borrowRequest';
import type { MyBorrowRequest } from '../../types/borrowRequest';
import { addDays, MAX_ADVANCE_DAYS, MAX_LOAN_DAYS, toDateInput, validateBorrowDates } from '../../utils/dateValidation';

type FormErrors = Partial<Record<'pickup_date' | 'due_date' | 'purpose', string>>;

/** Editable only while pending. Cancellation keeps a history record. The API enforces both rules. */
export default function BorrowerRequestActions({ request, onChanged }: {
  request: MyBorrowRequest;
  onChanged: (updated: MyBorrowRequest, message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pickupDate, setPickupDate] = useState(request.pickup_date);
  const [dueDate, setDueDate] = useState(request.due_date);
  const [purpose, setPurpose] = useState(request.purpose);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<FormErrors>({});
  const today = toDateInput(new Date());
  const beforePickup = request.pickup_date >= today;
  const canEdit = request.status === 'PENDING' && beforePickup;
  const canCancel = beforePickup && request.status === 'PENDING';

  if (!canEdit && !canCancel) return null;

  function reset() {
    setPickupDate(request.pickup_date);
    setDueDate(request.due_date);
    setPurpose(request.purpose);
    setError('');
    setFields({});
    setEditing(false);
    setConfirmCancel(false);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: FormErrors = validateBorrowDates(pickupDate, dueDate, today);
    if (!purpose.trim()) found.purpose = 'Please describe why you need this equipment.';
    setFields(found);
    setError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const updated = await updateMyBorrowRequest(request.id, {
        pickup_date: pickupDate, due_date: dueDate, purpose,
      });
      reset();
      onChanged(updated, 'Borrow request updated successfully.');
    } catch (cause) {
      if (cause instanceof MyRequestError) {
        setFields(cause.fields);
        setError(Object.keys(cause.fields).length ? '' : cause.message);
      } else setError('Unable to update this request. Please try again.');
    } finally { setBusy(false); }
  }

  async function cancel() {
    setBusy(true);
    setError('');
    try {
      const updated = await cancelMyBorrowRequest(request.id);
      reset();
      onChanged(updated, 'Borrow request cancelled.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to cancel this request.');
    } finally { setBusy(false); }
  }

  return (
    <section className="my-request-management" aria-label="Manage this request">
      {error && <p role="alert" className="provider-request-error">{error}</p>}
      {editing ? (
        <form onSubmit={save} noValidate aria-busy={busy} className="my-request-edit-form">
          <h3>Edit borrow request</h3>
          <p>You can change dates and purpose while your request is pending. The equipment cannot be changed.</p>
          <div className="borrow-request-dates">
            <div className="form-field">
              <label htmlFor="edit-pickup-date">Pickup date</label>
              <input id="edit-pickup-date" type="date" value={pickupDate} min={today} max={addDays(today, MAX_ADVANCE_DAYS)}
                disabled={busy} onChange={event => setPickupDate(event.target.value)} aria-invalid={Boolean(fields.pickup_date)} />
              {fields.pickup_date && <p className="form-error">{fields.pickup_date}</p>}
            </div>
            <div className="form-field">
              <label htmlFor="edit-due-date">Return date</label>
              <input id="edit-due-date" type="date" value={dueDate} disabled={busy}
                min={pickupDate ? addDays(pickupDate, 1) : addDays(today, 1)}
                max={pickupDate ? addDays(pickupDate, MAX_LOAN_DAYS) : undefined}
                onChange={event => setDueDate(event.target.value)} aria-invalid={Boolean(fields.due_date)} />
              {fields.due_date && <p className="form-error">{fields.due_date}</p>}
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="edit-purpose">Purpose</label>
            <textarea id="edit-purpose" rows={4} maxLength={1000} value={purpose} disabled={busy}
              onChange={event => setPurpose(event.target.value)} aria-invalid={Boolean(fields.purpose)} />
            {fields.purpose && <p className="form-error">{fields.purpose}</p>}
          </div>
          <div className="provider-request-actions">
            <button type="submit" className="provider-request-button provider-request-button-primary" disabled={busy}>
              {busy ? 'Saving...' : 'Save changes'}
            </button>
            <button type="button" className="provider-request-button" disabled={busy} onClick={reset}>Discard changes</button>
          </div>
        </form>
      ) : confirmCancel ? (
        <div className="my-request-confirm" role="group" aria-label="Confirm cancellation">
          <h3>Cancel this borrow request?</h3>
          <p>This will withdraw the request. You cannot undo cancellation, but the request will stay in your history.</p>
          <div className="provider-request-actions">
            <button type="button" className="provider-request-button provider-request-button-danger" disabled={busy} onClick={() => void cancel()}>
              {busy ? 'Cancelling...' : 'Yes, cancel request'}
            </button>
            <button type="button" className="provider-request-button" disabled={busy} onClick={() => { setConfirmCancel(false); setError(''); }}>Keep request</button>
          </div>
        </div>
      ) : (
        <div className="provider-request-actions">
          {canEdit && <button type="button" className="provider-request-button provider-request-button-primary" onClick={() => { setError(''); setEditing(true); }}>Edit details</button>}
          {canCancel && <button type="button" className="provider-request-button provider-request-button-danger" onClick={() => { setError(''); setConfirmCancel(true); }}>Cancel request</button>}
        </div>
      )}
    </section>
  );
}
