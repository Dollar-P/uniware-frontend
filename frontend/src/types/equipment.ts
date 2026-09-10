export type EquipmentStatus =
  | 'AVAILABLE'
  | 'RESERVED'
  | 'CHECKED_OUT'
  | 'MAINTENANCE'
  | 'ARCHIVED'
  | 'DISABLED';

export interface EquipmentCategory {
  id: string;
  name: string;
}

export interface EquipmentLocation {
  id: string;
  name: string;
}

export interface Equipment {
  id: string;
  asset_id: string;
  name: string;
  model: string;
  description: string;
  provider: string;
  category: EquipmentCategory;
  location: EquipmentLocation;
  status: EquipmentStatus;
  archived_at: string | null;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
}
