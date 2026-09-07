import { afterEach, describe, expect, it, vi } from 'vitest';
import { currentUser, login } from './sessionApi';
describe('session API', () => {
  afterEach(() => { vi.unstubAllGlobals(); document.cookie = 'csrftoken=; Max-Age=0'; });
  it('posts normalized email and unchanged password with cookies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'uuid' })));
    vi.stubGlobal('fetch', fetchMock);
    document.cookie = 'csrftoken=example';
    await login({ email: ' PERSON@CHULA.AC.TH ', password: ' spaces preserved ' });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
      method: 'POST', credentials: 'include',
      body: JSON.stringify({ email: 'person@chula.ac.th', password: ' spaces preserved ' }),
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'example' },
    }));
  });
  it('reports backend invalid credentials', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
    }), { status: 401 })));
    await expect(login({ email: 'user@chula.ac.th', password: 'wrong' })).rejects.toThrow('Invalid email or password.');
  });
  it('recognizes an expired session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    await expect(currentUser()).resolves.toBeNull();
  });
  it('does not treat backend failure as anonymous', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })));
    await expect(currentUser()).rejects.toThrow('Unable to reach your account');
  });
});
