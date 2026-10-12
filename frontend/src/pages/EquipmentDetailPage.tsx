import { useEffect, useState } from 'react';
import EquipmentDetails from '../components/equipment/EquipmentDetails';
import BorrowRequestModal from '../components/requests/BorrowRequestModal';
import { getEquipment } from '../services/equipmentApi';
import { EquipmentError, STATUS_LABELS } from '../types/equipment';
import type { Equipment, EquipmentStatus } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';
import type { BorrowRequest } from '../types/borrow';
import uniwareLogo from '../assets/brand/uniware-logo.svg';
import './MyEquipmentPage.css';
import './EquipmentDetailPage.css';

// RESERVED/CHECKED_OUT describe today, not the requested period, so the backend still
// accepts them and its date-range check decides (apps/borrowing/availability.py).
const REQUESTABLE_STATUSES: EquipmentStatus[] = ['AVAILABLE', 'RESERVED', 'CHECKED_OUT'];

export default function EquipmentDetailPage({ equipmentId, user }: { equipmentId: string; user?: RegisterResponse }) {
  const [attempt, setAttempt] = useState(0);
  // Keyed request content prevents stale details being shown after ID changes or retries.
  return (
    <main className="equipment-page">
      <header className="equipment-page-header">
        <a href="#account" aria-label="Your account"><img className="uniware-logo" src={uniwareLogo} alt="UniWare" /></a>
        <a className="equipment-back-link" href="#catalog">Back to catalog</a>
      </header>
      <section className="equipment-detail-content" aria-live="polite">
        <DetailContent key={`${equipmentId}:${attempt}`} equipmentId={equipmentId} user={user} retry={() => setAttempt(value => value + 1)} />
      </section>
    </main>
  );
}

function DetailContent({ equipmentId, user, retry }: { equipmentId: string; user?: RegisterResponse; retry: () => void }) {
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(!equipmentId);
  const [loading, setLoading] = useState(Boolean(equipmentId));
  useEffect(() => {
    if (!equipmentId) return;
    let active = true;
    void getEquipment(equipmentId)
      .then(result => { if (active) setEquipment(result); })
      .catch(cause => {
        if (!active) return;
        if (cause instanceof EquipmentError && cause.status === 401) {
          window.location.hash = 'login';
          return;
        }
        setNotFound(cause instanceof EquipmentError && cause.status === 404);
        setError(cause instanceof Error ? cause.message : 'Unable to load this equipment.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [equipmentId]);
  if (loading) return <p role="status">Loading equipment...</p>;
  if (notFound) return <div className="equipment-empty"><h1>Equipment not found</h1><p>This item does not exist or is no longer visible in the catalog.</p></div>;
  if (error) return <div className="equipment-error"><p className="form-message form-message-error" role="alert">{error}</p><button className="register-button" onClick={retry}>Try again</button></div>;
  return equipment ? <><EquipmentDetails equipment={equipment} /><BorrowAction equipment={equipment} user={user} /></> : null;
}

function BorrowAction({ equipment, user }: { equipment: Equipment; user?: RegisterResponse }) {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<BorrowRequest | null>(null);
  // The backend enforces these too; hiding the action just avoids a request that must fail.
  if (!user?.is_borrower || equipment.provider === user.id) return null;
  if (!REQUESTABLE_STATUSES.includes(equipment.status)) {
    return <div className="equipment-borrow"><p className="equipment-borrow-note">
      This equipment cannot be requested while its status is {STATUS_LABELS[equipment.status].toLowerCase()}.
    </p></div>;
  }
  return (
    <div className="equipment-borrow">
      {submitted && <p className="form-message form-message-success" role="status">
        Request submitted for {submitted.pickup_date} to {submitted.due_date}. It is pending the provider's approval.
      </p>}
      <button className="register-button" type="button" onClick={() => { setSubmitted(null); setOpen(true); }}>Request to borrow</button>
      {open && <BorrowRequestModal equipment={equipment} onClose={() => setOpen(false)}
        onSubmitted={request => { setOpen(false); setSubmitted(request); }} />}
    </div>
  );
}
