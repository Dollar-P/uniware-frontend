import { STATUS_LABELS } from '../../types/equipment';
import type { Equipment } from '../../types/equipment';

/** Shared list row for US2-2 (provider inventory) and, later, the US3-1 catalog. */
export default function EquipmentCard({ equipment, onEdit }: {
  equipment: Equipment;
  onEdit?: (equipment: Equipment) => void;
}) {
  return (
    <li className="equipment-card">
      <div className="equipment-card-main">
        <h3 className="equipment-card-name">{equipment.name}</h3>
        <p className="equipment-card-asset">{equipment.asset_id}</p>
        {equipment.model && <p className="equipment-card-model">{equipment.model}</p>}
      </div>
      <dl className="equipment-card-meta">
        <div><dt>Category</dt><dd>{equipment.category.name}</dd></div>
        <div><dt>Location</dt><dd>{equipment.location.name}</dd></div>
      </dl>
      <div className="equipment-card-actions">
        <span className={`equipment-status equipment-status-${equipment.status.toLowerCase()}`}>
          {STATUS_LABELS[equipment.status]}
        </span>
        {onEdit && (
          <button className="register-button button-secondary" type="button" onClick={() => onEdit(equipment)}>
            Edit
          </button>
        )}
      </div>
    </li>
  );
}
