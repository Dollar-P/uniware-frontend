export const EQUIPMENT_STATUSES = ['AVAILABLE', 'RESERVED', 'CHECKED_OUT', 'MAINTENANCE', 'ARCHIVED', 'DISABLED'] as const;
export type EquipmentStatus = (typeof EQUIPMENT_STATUSES)[number];

/** US2-5: the only statuses a provider may set from the UI. Mirrors
 *  PROVIDER_SETTABLE_STATUSES in apps/equipment/models.py. */
export const PROVIDER_SETTABLE_STATUSES = ['AVAILABLE', 'MAINTENANCE'] as const;
export type ProviderSettableStatus = (typeof PROVIDER_SETTABLE_STATUSES)[number];

export const STATUS_LABELS: Record<EquipmentStatus, string> = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  CHECKED_OUT: 'Checked out',
  MAINTENANCE: 'Maintenance',
  ARCHIVED: 'Archived',
  DISABLED: 'Disabled',
};

export interface Category { id: string; name: string }
export interface Location { id: string; name: string }

export interface Equipment {
  id: string;
  asset_id: string;
  name: string;
  model: string;
  description: string;
  provider: string;
  category: Category;
  location: Location;
  status: EquipmentStatus;
  archived_at: string | null;
  disabled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Write shape for POST /equipment and PATCH /equipment/:id. */
export interface EquipmentRequest {
  asset_id: string;
  name: string;
  model?: string;
  description?: string;
  category_id: string;
  location_id: string;
  status?: ProviderSettableStatus;
}

export type EquipmentFormErrors = Partial<Record<keyof EquipmentRequest, string>>;

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Mirrors RegistrationError: a message for the banner plus per-field messages. */
export class EquipmentError extends Error {
  fields: EquipmentFormErrors;
  status: number;
  constructor(message: string, fields: EquipmentFormErrors = {}, status = 0) {
    super(message);
    this.name = 'EquipmentError';
    this.fields = fields;
    this.status = status;
  }
}
