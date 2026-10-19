import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { createBorrowRequest } from '../../services/borrowService';
import { BorrowRequestError } from '../../types/borrow';
import type { BorrowRequest, BorrowRequestFormErrors } from '../../types/borrow';
import { MAX_ADVANCE_DAYS, MAX_LOAN_DAYS, addDays, toDateInput, validateBorrowDates } from '../../utils/dateValidation';

const PURPOSE_MAX_LENGTH = 1000; // Frontend input limit; the backend accepts a nonempty purpose.

/** US4-1/US4-2: borrower submits pickup/due dates and purpose for one equipment item. */
export default function BorrowRequestModal({ equipment, onClose, onSubmitted }: {
  equipment: { id: string; name: string };
  onClose: () => void;
  onSubmitted: (request: BorrowRequest) => void;
}) {
  const [pickupDate, setPickupDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [purpose, setPurpose] = useState('');
  const [errors, setErrors] = useState<BorrowRequestFormErrors>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const today = toDateInput(new Date());

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: BorrowRequestFormErrors = { ...validateBorrowDates(pickupDate, dueDate, today) };
    if (!purpose.trim()) found.purpose = 'Please describe why you need this equipment.';
    setErrors(found);
    setError('');
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      onSubmitted(await createBorrowRequest({ equipment_id: equipment.id, pickup_date: pickupDate, due_date: dueDate, purpose }));
    } catch (cause) {
      if (cause instanceof BorrowRequestError && cause.status === 401) {
        window.location.assign('#login');
        return;
      }
      const fields = cause instanceof BorrowRequestError ? cause.fields : {};
      setErrors(fields);
      // Field messages already explain a 400; the banner covers conflicts and everything else.
      if (!Object.keys(fields).length) {
        setError(cause instanceof Error && cause.message ? cause.message : 'Unable to submit your request. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="borrow-request-overlay">
      <section role="dialog" aria-modal="true" aria-labelledby="borrow-request-title" className="borrow-request-dialog">
        <h2 id="borrow-request-title">Request to borrow {equipment.name}</h2>
        <p className="borrow-request-hint">
          Loans last up to {MAX_LOAN_DAYS} days and can start up to {MAX_ADVANCE_DAYS} days from today.
          Return the item by the due date.
        </p>
        <form className="register-form" onSubmit={submit} noValidate aria-busy={busy}>
          <div className="borrow-request-dates">
            <div className="form-field">
              <label htmlFor="borrow-pickup-date">Pickup date</label>
              <input id="borrow-pickup-date" type="date" value={pickupDate} min={today} max={addDays(today, MAX_ADVANCE_DAYS)}
                onChange={event => setPickupDate(event.target.value)} disabled={busy}
                aria-invalid={Boolean(errors.pickup_date)} aria-describedby={errors.pickup_date ? 'borrow-pickup-date-error' : undefined} />
              {errors.pickup_date && <p className="form-error" id="borrow-pickup-date-error">{errors.pickup_date}</p>}
            </div>
            <div className="form-field">
              <label htmlFor="borrow-due-date">Due date</label>
              <input id="borrow-due-date" type="date" value={dueDate} min={pickupDate ? addDays(pickupDate, 1) : addDays(today, 1)}
                max={pickupDate ? addDays(pickupDate, MAX_LOAN_DAYS) : undefined}
                onChange={event => setDueDate(event.target.value)} disabled={busy}
                aria-invalid={Boolean(errors.due_date)} aria-describedby={errors.due_date ? 'borrow-due-date-error' : undefined} />
              {errors.due_date && <p className="form-error" id="borrow-due-date-error">{errors.due_date}</p>}
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="borrow-purpose">Purpose</label>
            <textarea id="borrow-purpose" value={purpose} rows={4} maxLength={PURPOSE_MAX_LENGTH} disabled={busy}
              onChange={event => setPurpose(event.target.value)} placeholder="What will you use this equipment for?"
              aria-invalid={Boolean(errors.purpose)} aria-describedby={errors.purpose ? 'borrow-purpose-error' : undefined} />
            {errors.purpose && <p className="form-error" id="borrow-purpose-error">{errors.purpose}</p>}
          </div>
          {errors.equipment_id && <p className="form-message form-message-error" role="alert">{errors.equipment_id}</p>}
          {error && <p className="form-message form-message-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="register-button button-secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="register-button" type="submit" disabled={busy}>{busy ? 'Submitting...' : 'Submit request'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
