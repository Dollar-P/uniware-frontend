import type { RegisterResponse, ApiError } from '../types/auth';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export interface LoginRequest { email: string; password: string }
export class SessionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
async function readUser(response: Response): Promise<RegisterResponse> {
  if (!response.ok) {
    const body: ApiError | null = await response.json().catch(() => null);
    throw new SessionError(body?.error?.message || 'Unable to reach your account. Please try again.', response.status);
  }
  return response.json();
}
export async function login(data: LoginRequest): Promise<RegisterResponse> {
  const token = document.cookie.split('; ').find(value => value.startsWith('csrftoken='));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-CSRFToken'] = decodeURIComponent(token.slice(10));
  return readUser(await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', credentials: 'include', headers,
    body: JSON.stringify({ email: data.email.trim().toLowerCase(), password: data.password }),
  }));
}
export async function currentUser(): Promise<RegisterResponse | null> {
  const response = await fetch(`${baseUrl}/auth/me`, { credentials: 'include', cache: 'no-store' });
  if (response.status === 401) return null;
  return readUser(response);
}
