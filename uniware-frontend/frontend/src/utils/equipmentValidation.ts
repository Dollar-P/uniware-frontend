import type { EquipmentFormErrors, EquipmentRequest } from '../types/equipment';

/** Mirrors the model field limits in apps/equipment/models.py so the user gets
 *  feedback before a round trip. The server stays the source of truth. */
export function validateEquipment(data: EquipmentRequest): EquipmentFormErrors {
  const errors: EquipmentFormErrors = {};

  const assetId = data.asset_id.trim();
  if (!assetId) errors.asset_id = 'Asset ID is required';
  else if (assetId.length > 64) errors.asset_id = 'Asset ID must be at most 64 characters';

  const name = data.name.trim();
  if (!name) errors.name = 'Equipment name is required';
  else if (name.length > 200) errors.name = 'Equipment name must be at most 200 characters';

  if ((data.model?.trim().length ?? 0) > 200) errors.model = 'Model must be at most 200 characters';

  if (!data.category_id) errors.category_id = 'Category is required';
  if (!data.location_id) errors.location_id = 'Location is required';

  return errors;
}
