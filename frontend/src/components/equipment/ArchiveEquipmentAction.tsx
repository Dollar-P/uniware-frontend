import { useEffect, useId, useRef, useState } from 'react';
import { archiveEquipment } from '../../services/equipmentApi';
import type { Equipment } from '../../types/equipment';

export default function ArchiveEquipmentAction({ equipment, onArchived }: {
  equipment: Equipment;
  onArchived: (equipment: Equipment) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const archiveButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const descriptionId = useId();
  const blocked = equipment.status === 'RESERVED' || equipment.status === 'CHECKED_OUT';

  useEffect(() => {
    if (confirming) cancelButton.current?.focus();
    else if (restoreFocus.current) {
      archiveButton.current?.focus();
      restoreFocus.current = false;
    }
  }, [confirming]);

  async function confirmArchive() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      onArchived(await archiveEquipment(equipment.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to archive equipment. Please try again.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!confirming) return (
    <div className="equipment-archive-action">
      <button ref={archiveButton} className="register-button button-secondary" type="button"
        disabled={blocked} aria-describedby={blocked ? descriptionId : undefined}
        onClick={() => { setError(''); setConfirming(true); }}>
        Archive
      </button>
      {blocked && <p id={descriptionId} className="equipment-archive-hint">Resolve the reservation or loan before archiving.</p>}
    </div>
  );

  return (
    <section className="equipment-archive-confirmation" aria-label={`Archive ${equipment.name}`} aria-busy={busy}>
      <p>Archive <strong>{equipment.name}</strong> ({equipment.asset_id})?</p>
      <p id={descriptionId}>Borrowers will no longer see this item. Its asset ID and request history will be kept. Archived equipment cannot be edited or restored.</p>
      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button ref={cancelButton} className="register-button button-secondary" type="button" disabled={busy}
          onClick={() => { restoreFocus.current = true; setConfirming(false); }}>
          Cancel
        </button>
        <button className="register-button" type="button" disabled={busy}
          aria-describedby={descriptionId} onClick={() => void confirmArchive()}>
          {busy ? 'Archiving...' : 'Confirm archive'}
        </button>
      </div>
    </section>
  );
}
