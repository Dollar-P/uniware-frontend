import { afterEach, describe, expect, it, vi } from 'vitest';
import { getProfile, updateProfile } from './profileApi';
import { validateProfile } from '../types/profile';
describe('profile contract', () => {
  afterEach(() => { vi.unstubAllGlobals(); document.cookie = 'csrftoken=; Max-Age=0'; });
  it('falls back to the existing read-only endpoint only when profile is absent', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'u' })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(getProfile()).resolves.toEqual({ id: 'u' });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/auth/me', { credentials: 'include', cache: 'no-store' });
  });
  it('allows only editable keys and sends CSRF on PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'u' })));
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = 'csrftoken=token';
    const unsafe = { first_name: ' Pat ', last_name: 'User', department: '', email: 'changed@chula.ac.th', is_admin: true };
    await updateProfile(unsafe);
    expect(fetchMock).toHaveBeenCalledWith('/api/profile', expect.objectContaining({
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'token' },
      body: JSON.stringify({ first_name: 'Pat', last_name: 'User', department: '' }),
    }));
  });
  it('does not claim success when the update endpoint is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 405 })));
    await expect(updateProfile({ first_name: 'Pat', last_name: 'User', department: '' })).rejects.toThrow('have not been saved');
  });
  it('reports authentication failure without attempting fallback', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(getProfile()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('validates name characters and field limits without rejecting Thai names', () => {
    expect(validateProfile({ first_name: 'สมชาย', last_name: 'ใจดี', department: '' })).toEqual({});
    expect(validateProfile({ first_name: 'Pat1', last_name: 'x'.repeat(151), department: 'x'.repeat(256) })).toEqual({
      first_name: expect.any(String), last_name: expect.any(String), department: expect.any(String),
    });
  });
});
