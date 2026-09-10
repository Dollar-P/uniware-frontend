import type { Equipment } from '../../types/equipment';

const statusLabels: Record<Equipment['status'], string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  CHECKED_OUT: 'Checked out',
  MAINTENANCE: 'Maintenance',
  ARCHIVED: 'Archived',
  DISABLED: 'Disabled',
};

export default function EquipmentDetails({ equipment }: { equipment: Equipment }) {
  return (
    <article className="equipment-details-card">
      <header className="equipment-details-header">
        <p className="equipment-asset-id">{equipment.asset_id}</p>
        <h1>{equipment.name}</h1>
        <span className={`equipment-status equipment-status-${equipment.status.toLowerCase()}`}>
          {statusLabels[equipment.status]}
        </span>
      </header>
      <dl className="equipment-details-list">
        <div><dt>Model</dt><dd>{equipment.model || 'Not specified'}</dd></div>
        <div><dt>Category</dt><dd>{equipment.category.name}</dd></div>
        <div><dt>Location</dt><dd>{equipment.location.name}</dd></div>
        <div><dt>Description</dt><dd>{equipment.description || 'No description provided.'}</dd></div>
      </dl>
    </article>
  );
}
