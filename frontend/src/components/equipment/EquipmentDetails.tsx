import { STATUS_LABELS } from '../../types/equipment';
import type { Equipment } from '../../types/equipment';

export default function EquipmentDetails({ equipment }: { equipment: Equipment }) {
  return (
    <article className="equipment-details-card">
      <header className="equipment-details-header">
        <div>
          <p className="equipment-asset-id">{equipment.asset_id}</p>
          <h1>{equipment.name}</h1>
        </div>
        <span className={`equipment-status equipment-status-${equipment.status.toLowerCase()}`}>
          {STATUS_LABELS[equipment.status]}
        </span>
      </header>
      <dl className="equipment-details-list">
        <div><dt>Model</dt><dd>{equipment.model || 'Not specified'}</dd></div>
        <div><dt>Category</dt><dd>{equipment.category.name}</dd></div>
        <div><dt>Location</dt><dd>{equipment.location.name}</dd></div>
        <div><dt>Owner</dt><dd>{equipment.owner.name}</dd></div>
        <div><dt>Owner email</dt><dd><a href={`mailto:${equipment.owner.email}`}>{equipment.owner.email}</a></dd></div>
        <div><dt>Owner department</dt><dd>{equipment.owner.department || 'Not specified'}</dd></div>
        <div><dt>Description</dt><dd>{equipment.description || 'No description provided.'}</dd></div>
      </dl>
    </article>
  );
}
