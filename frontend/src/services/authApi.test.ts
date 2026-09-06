import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const request = { first_name: 'Putter', last_name: 'Smith', email: 'putter@chula.ac.th', password: 'unusual phrase here' };
describe('registerUser HTTP contract', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_USE_MOCK_API', 'false');
    vi.stubEnv('VITE_API_BASE_URL', '/api');
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    document.cookie = 'csrftoken=; Max-Age=0; path=/';
  });
  it('uses the real endpoint, cookies, CSRF token and bare response', async () => {
    document.cookie = 'csrftoken=test-token; path=/';
    const user = { id: 'uuid', ...request, is_borrower: true };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(user), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const { registerUser } = await import('./authApi');
    expect(await registerUser(request)).toEqual(user);
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
      method: 'POST', credentials: 'include', body: JSON.stringify(request),
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'test-token' },
    }));
  });
  it('extracts duplicate-email errors from the backend envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'VALIDATION_ERROR', message: 'Email already exists.', details: { email: ['Email already exists.'] } },
    }), { status: 400 })));
    const { registerUser } = await import('./authApi');
    await expect(registerUser(request)).rejects.toMatchObject({
      message: 'Email already exists.', fields: { email: 'Email already exists.' },
    });
  });
  it('handles non-JSON server failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })));
    const { registerUser } = await import('./authApi');
    await expect(registerUser(request)).rejects.toThrow('Registration failed. Please try again.');
  });
});
