import type { ApiError } from '../types/auth';
import { EDITABLE_PROFILE_FIELDS, ProfileError } from '../types/profile';
import type { Profile, ProfileErrors, ProfileUpdate } from '../types/profile';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function readProfile(response: Response): Promise<Profile> {
  if (!response.ok) {
    const body: ApiError | null = await response.json().catch(() => null);
    const fields: ProfileErrors = {};
    const details = body?.error?.details;
    if (details && !Array.isArray(details)) {
      for (const field of EDITABLE_PROFILE_FIELDS) {
        if (Array.isArray(details[field])) fields[field] = details[field].join(' ');
      }
    }
    throw new ProfileError(body?.error?.message || 'Unable to load your profile. Please try again.', response.status, fields);
  }
  return response.json();
}

export async function getProfile(): Promise<Profile> {
  let response = await fetch(`${baseUrl}/profile`, { credentials: 'include', cache: 'no-store' });
  // The existing backend exposes read-only profile data at /auth/me.
  if (response.status === 404) {
    response = await fetch(`${baseUrl}/auth/me`, { credentials: 'include', cache: 'no-store' });
  }
  return readProfile(response);
}

export async function updateProfile(data: ProfileUpdate): Promise<Profile> {
  // Explicit allowlist: never send roles, email, IDs, status, or password.
  const body = Object.fromEntries(EDITABLE_PROFILE_FIELDS.map(field => [field, data[field].trim()]));
  const token = document.cookie.split('; ').find(cookie => cookie.startsWith('csrftoken='));
  const response = await fetch(`${baseUrl}/profile`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-CSRFToken': decodeURIComponent(token.slice('csrftoken='.length)) } : {}),
    },
    body: JSON.stringify(body),
  });
  if (response.status === 404 || response.status === 405) {
    throw new ProfileError('Profile updates are not available yet. Your changes have not been saved.', response.status);
  }
  return readProfile(response);
}
