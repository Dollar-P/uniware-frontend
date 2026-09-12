import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEquipment, getEquipment, listCategories, listEquipment, listMyEquipment, updateEquipment } from './equipmentApi';
import { EquipmentError } from '../types/equipment';

const page = { count: 0, next: null, previous: null, results: [] };

describe('equipment API', () => {
  it('requests catalog pages with session cookies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(page)));
    vi.stubGlobal('fetch', fetchMock);
    await listEquipment(2);
    expect(fetchMock).toHaveBeenCalledWith('/api/equipment?page=2', { credentials: 'include', cache: 'no-store' });
  });
  it('encodes a detail ID as one URL segment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'a/b' })));
    vi.stubGlobal('fetch', fetchMock);
    await getEquipment('a/b');
    expect(fetchMock).toHaveBeenCalledWith('/api/equipment/a%2Fb', { credentials: 'include', cache: 'no-store' });
  });
  afterEach(() => { vi.unstubAllGlobals(); document.cookie = 'csrftoken=; Max-Age=0'; });

  it('US2-2: requests only the provider inventory endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(page)));
    vi.stubGlobal('fetch', fetchMock);
    await listMyEquipment();
    expect(fetchMock).toHaveBeenCalledWith('/api/provider/equipment?page=1', {
      credentials: 'include', cache: 'no-store',
    });
  });

  it('US2-2: surfaces access-denied as a 403 status the page can branch on', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { message: 'This action requires provider capability.' },
    }), { status: 403 })));
    await expect(listMyEquipment()).rejects.toMatchObject({ status: 403 });
  });

  it('US2-1: posts with the CSRF token from the cookie', async () => {
    document.cookie = 'csrftoken=add-token';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'uuid' }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await createEquipment({
      asset_id: 'AST-1', name: 'Microscope', category_id: 'cat-1', location_id: 'loc-1',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/equipment', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'add-token' },
    }));
  });

  it('US2-1: maps server field errors onto the form fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: {
        message: 'Request failed.',
        details: { asset_id: ['Equipment with this asset id already exists.'] },
      },
    }), { status: 400 })));
    await expect(createEquipment({
      asset_id: 'AST-1', name: 'Microscope', category_id: 'cat-1', location_id: 'loc-1',
    })).rejects.toMatchObject({
      fields: { asset_id: 'Equipment with this asset id already exists.' },
    });
  });

  it('US2-3: PATCHes only the edited item', async () => {
    document.cookie = 'csrftoken=edit-token';
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'uuid' })));
    vi.stubGlobal('fetch', fetchMock);
    await updateEquipment('uuid', { name: 'Renamed' });
    expect(fetchMock).toHaveBeenCalledWith('/api/equipment/uuid', expect.objectContaining({
      method: 'PATCH',
      credentials: 'include',
      body: JSON.stringify({ name: 'Renamed' }),
    }));
  });

  it('US2-3: reports the state-machine rejection message from the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: {
        message: 'Cannot change status from Available to Archived.',
        details: { status: ['Cannot change status from Available to Archived.'] },
      },
    }), { status: 400 })));
    await expect(updateEquipment('uuid', { status: 'AVAILABLE' }))
      .rejects.toThrow('Cannot change status from Available to Archived.');
  });

  it('US2-3: fetches a single item to prefill the edit form', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'uuid' })));
    vi.stubGlobal('fetch', fetchMock);
    await getEquipment('uuid');
    expect(fetchMock).toHaveBeenCalledWith('/api/equipment/uuid', {
      credentials: 'include', cache: 'no-store',
    });
  });

  it('US2-5: reads the unpaginated category list', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 'c1', name: 'Robotics' }])));
    vi.stubGlobal('fetch', fetchMock);
    await expect(listCategories()).resolves.toEqual([{ id: 'c1', name: 'Robotics' }]);
    expect(fetchMock).toHaveBeenCalledWith('/api/categories', { credentials: 'include' });
  });

  it('throws an EquipmentError even when the body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>502</html>', { status: 502 })));
    await expect(listMyEquipment()).rejects.toBeInstanceOf(EquipmentError);
  });
});
