import { afterEach, describe, expect, it, vi } from 'vitest';
import { listEquipment } from './equipmentApi';
import type { CatalogAvailability } from '../types/catalogFilters';

afterEach(() => vi.unstubAllGlobals());

describe('US3-3 filter contract', () => {
  it.each([
    { category: 'cat-1' }, { location: 'loc-1' },
    { status: 'AVAILABLE' as const }, { status: 'RESERVED' as const },
    { status: 'CHECKED_OUT' as const }, { status: 'MAINTENANCE' as const },
  ])('sends a single supported filter %o', async filters => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await listEquipment(1, filters);
    const url = new URL(fetch.mock.calls[0][0], 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toEqual({ page: '1', ...filters });
    expect(fetch.mock.calls[0][1]).toEqual({ credentials: 'include', cache: 'no-store' });
  });

  it('combines filters in one request while preserving pagination and encoding', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await listEquipment(3, { category: '  cat&1 ', location: 'loc/2', status: 'AVAILABLE' });
    const url = new URL(fetch.mock.calls[0][0], 'http://localhost');
    expect(url.pathname).toBe('/api/equipment');
    expect(Object.fromEntries(url.searchParams)).toEqual({ page: '3', category: 'cat&1', location: 'loc/2', status: 'AVAILABLE' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('omits empty reference filters', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetch);
    await listEquipment(1, { category: ' ', location: '' });
    expect(fetch.mock.calls[0][0]).toBe('/api/equipment?page=1');
  });

  it.each(['ARCHIVED', 'DISABLED', 'unknown', ''])('rejects unsupported availability %s before fetching', async status => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    await expect(listEquipment(1, { status: status as CatalogAvailability })).rejects.toMatchObject({ status: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('surfaces server rejection of stale reference IDs instead of silently removing filters', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Unknown category.' } }), { status: 400 }));
    vi.stubGlobal('fetch', fetch);
    await expect(listEquipment(1, { category: 'removed-id' })).rejects.toMatchObject({ status: 400, message: 'Unknown category.' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
