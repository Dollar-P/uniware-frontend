import type { RegisterResponse, ApiError } from '../types/auth';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export type UserRoles = Pick<RegisterResponse, 'is_admin' | 'is_provider' | 'is_borrower'>;

async function request(path: string, init: RequestInit = {}): Promise<RegisterResponse[] | RegisterResponse> {
  const token = document.cookie.split('; ').find(value => value.startsWith('csrftoken='));
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string> | undefined) };
  if (token) headers['X-CSRFToken'] = decodeURIComponent(token.slice('csrftoken='.length));
  const response = await fetch(`${baseUrl}/auth/users${path}`, { ...init, credentials: 'include', headers });
  if (!response.ok) {
    const body: ApiError | { detail?: string } | null = await response.json().catch(() => null);
    const message = body && 'error' in body ? body.error?.message : body && 'detail' in body ? body.detail : undefined;
    throw new Error(message || `User management request failed (${response.status}).`);
  }
  return response.json();
}
export async function listUsers(): Promise<RegisterResponse[]> {
  return await request('') as RegisterResponse[];
}
export async function updateUserRoles(id: string, roles: Partial<UserRoles>): Promise<RegisterResponse> {
  return await request(`/${encodeURIComponent(id)}/roles`, { method: 'PATCH', body: JSON.stringify(roles) }) as RegisterResponse;
}
