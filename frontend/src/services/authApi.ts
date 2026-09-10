import { RegistrationError } from '../types/auth';
import type { RegisterRequest, RegisterResponse, ApiError, RegisterFormErrors } from '../types/auth';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';
export async function registerUser(data: RegisterRequest): Promise<RegisterResponse> {
  if (USE_MOCK_API) {
    if (data.email === '1111111111@student.chula.ac.th') {
      throw new RegistrationError('An account with this email already exists.', {
        email: 'An account with this email already exists.',
      });
    }
    return {
      id: 'mock-user-1', first_name: data.first_name, last_name: data.last_name,
      email: data.email, department: data.department ?? '',
      is_admin: false, is_provider: false, is_borrower: true,
      account_status: 'ACTIVE', date_joined: new Date().toISOString(),
    };
  }
  const csrfCookie = document.cookie.split('; ').find((cookie) => cookie.startsWith('csrftoken='));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (csrfCookie) headers['X-CSRFToken'] = decodeURIComponent(csrfCookie.slice('csrftoken='.length));
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST', credentials: 'include', headers, body: JSON.stringify(data),
  });
  if (!response.ok) {
    const payload: ApiError | null = await response.json().catch(() => null);
    const fields: RegisterFormErrors = {};
    const details = payload?.error?.details;
    if (details && !Array.isArray(details)) {
      for (const field of ['first_name', 'last_name', 'email', 'password', 'department'] as const) {
        if (Array.isArray(details[field])) fields[field] = details[field].join(' ');
      }
    }
    throw new RegistrationError(payload?.error?.message || 'Registration failed. Please try again.', fields);
  }
  return response.json();
}
