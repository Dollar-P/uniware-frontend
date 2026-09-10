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
  category: EquipmentCategory;
  location: EquipmentLocation;
  status: 'AVAILABLE' | 'RESERVED' | 'CHECKED_OUT' | 'MAINTENANCE';
  created_at: string;
  updated_at: string;
}

export interface EquipmentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Equipment[];
}