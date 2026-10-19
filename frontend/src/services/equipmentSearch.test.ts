import { afterEach, describe, expect, it, vi } from 'vitest';
import { listEquipment } from './equipmentApi';

afterEach(() => vi.unstubAllGlobals());

describe('US3-2 search contract', () => {
  it('encodes and trims search without changing case or losing pagination', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [], count: 0 })));
    vi.stubGlobal('fetch', fetch);
    await listEquipment(2, { search: '  กล้อง MX & 5/2  ' });
    const url = new URL(fetch.mock.calls[0][0], 'http://localhost');
    expect(url.pathname).toBe('/api/equipment');
    expect([...url.searchParams]).toEqual([['page', '2'], ['search', 'กล้อง MX & 5/2']]);
    expect(fetch.mock.calls[0][1]).toEqual({ credentials: 'include', cache: 'no-store' });
  });

  it('omits blank search to preserve the existing catalog request', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await listEquipment(1, { search: '   ' });
    expect(fetch.mock.calls[0][0]).toBe('/api/equipment?page=1');
  });

  it('surfaces server errors without returning unfiltered results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'Search is unavailable.' },
    }), { status: 503 })));
    await expect(listEquipment(1, { search: 'camera' })).rejects.toMatchObject({
      message: 'Search is unavailable.', status: 503,
    });
  });
});
