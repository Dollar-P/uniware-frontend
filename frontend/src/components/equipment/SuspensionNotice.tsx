import type { Equipment } from '../../types/equipment';

/** Effective suspension is independent of physical availability and request status. */
export default function SuspensionNotice({ equipment }: { equipment: Equipment }) {
  if (!equipment.is_suspended) return null;
  return <p className="equipment-suspension-notice" role="status">
    <strong>Equipment suspended.</strong> {equipment.suspension_reason || 'New requests, approvals and checkout are disabled until reactivation.'}
  </p>;
}
