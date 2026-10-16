import { EquipmentError } from '../types/equipment';
import type { ApiError } from '../types/auth';
import type { AdminEquipment, Category, Equipment, EquipmentFormErrors, EquipmentRequest, Location, Paginated } from '../types/equipment';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

const WRITABLE_FIELDS = ['asset_id', 'name', 'model', 'description', 'category_id', 'location_id', 'status'] as const;

function csrfHeaders(): Record<string, string> {
  const token = document.cookie.split('; ').find(value => value.startsWith('csrftoken='));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-CSRFToken'] = decodeURIComponent(token.slice('csrftoken='.length));
  return headers;
}

async function fail(response: Response, fallback: string): Promise<never> {
  const payload: ApiError | null = await response.json().catch(() => null);
  const fields: EquipmentFormErrors = {};
  const details = payload?.error?.details;
  if (details && !Array.isArray(details)) {
    for (const field of WRITABLE_FIELDS) {
      const value = details[field];
      if (Array.isArray(value)) fields[field] = value.join(' ');
    }
  }
  throw new EquipmentError(payload?.error?.message || fallback, fields, response.status);
}

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  if (!response.ok) return fail(response, fallback);
  return response.json();
}

/** US3-1: the shared catalog. Borrowers see only borrowable statuses (enforced server-side). */
export async function listEquipment(page = 1): Promise<Paginated<Equipment>> {
  const response = await fetch(`${baseUrl}/equipment?page=${page}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return readJson(response, 'Unable to load equipment. Please try again.');
}

/** US2-2: only the equipment owned by the signed-in provider. */
export async function listMyEquipment(page = 1): Promise<Paginated<Equipment>> {
  const response = await fetch(`${baseUrl}/provider/equipment?page=${page}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return readJson(response, 'Unable to load your equipment. Please try again.');
}

/** US3-4 / US2-3: a single item, used for the detail page and to prefill the edit form. */
export async function getEquipment(id: string): Promise<Equipment> {
  const response = await fetch(`${baseUrl}/equipment/${encodeURIComponent(id)}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return readJson(response, 'Unable to load this equipment. Please try again.');
}

/** US2-1: providers add equipment. */
export async function createEquipment(data: EquipmentRequest): Promise<Equipment> {
  const response = await fetch(`${baseUrl}/equipment`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
  return readJson(response, 'Unable to add equipment. Please try again.');
}

/** US2-3: providers edit their own equipment. */
export async function updateEquipment(id: string, data: Partial<EquipmentRequest>): Promise<Equipment> {
  const response = await fetch(`${baseUrl}/equipment/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: csrfHeaders(),
    body: JSON.stringify(data),
  });
  return readJson(response, 'Unable to save your changes. Please try again.');
}

/** US8-4: the admin moderation listing. Unlike the catalog it includes the records that
 *  have left it — disabled and archived — because they stay available for administration. */
export async function listAdminEquipment(page = 1): Promise<Paginated<AdminEquipment>> {
  const response = await fetch(`${baseUrl}/admin/equipment?page=${page}`, {
    credentials: 'include',
    cache: 'no-store',
  });
  return readJson(response, 'Unable to load the equipment listings. Please try again.');
}

/** US8-4: take an inappropriate or misleading listing out of the borrower catalog. The
 *  reason is required and is kept on the record; nothing is deleted. The admin routes
 *  carry no trailing slash — apps/equipment/urls.py uses trailing_slash=False. */
export async function disableEquipment(id: string, reason: string): Promise<AdminEquipment> {
  const response = await fetch(`${baseUrl}/admin/equipment/${encodeURIComponent(id)}/disable`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeaders(),
    body: JSON.stringify({ reason }),
  });
  return readJson(response, 'Unable to disable this listing. Please try again.');
}

/** US8-4: put a disabled listing back in the catalog as available. */
export async function enableEquipment(id: string): Promise<AdminEquipment> {
  const response = await fetch(`${baseUrl}/admin/equipment/${encodeURIComponent(id)}/enable`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeaders(),
  });
  return readJson(response, 'Unable to re-enable this listing. Please try again.');
}

/** US2-5: reference data for the category and location pickers. Both are unpaginated. */
export async function listCategories(): Promise<Category[]> {
  const response = await fetch(`${baseUrl}/categories`, { credentials: 'include' });
  return readJson(response, 'Unable to load categories.');
}

export async function listLocations(): Promise<Location[]> {
  const response = await fetch(`${baseUrl}/locations`, { credentials: 'include' });
  return readJson(response, 'Unable to load locations.');
}
