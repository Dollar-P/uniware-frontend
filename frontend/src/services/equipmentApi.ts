import type { ApiError } from '../types/auth';
import type { Equipment } from '../types/equipment';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export class EquipmentError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'EquipmentError';
    this.status = status;
  }
}

export async function getEquipment(id: string): Promise<Equipment> {
  const response = await fetch(`${baseUrl}/equipment/${encodeURIComponent(id)}`, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    const body: ApiError | null = await response.json().catch(() => null);
    throw new EquipmentError(
      body?.error?.message || 'Unable to load this equipment.',
      response.status,
    );
  }

  return response.json() as Promise<Equipment>;
}
