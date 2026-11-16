import { afterEach, describe, expect, it, vi } from 'vitest';
import { archiveEquipment, createEquipment, getEquipment, listCategories, listEquipment, listMyEquipment, updateEquipment } from './equipmentApi';
import { EquipmentError } from '../types/equipment';

const page = { count: 0, next: null, previous: null, results: [] };

describe('equipment API', () => {
  it('US2-4: posts to the archive endpoint with session cookies and CSRF', async () => {
    document.cookie = 'csrftoken=archive-token';
    const archived = { id: 'a/b', status: 'ARCHIVED', archived_at: '2026-11-15T12:00:00Z' };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(archived)));
    vi.stubGlobal('fetch', fetchMock);
    await expect(archiveEquipment('a/b')).resolves.toEqual(archived);
    expect(fetchMock).toHaveBeenCalledWith('/api/equipment/a%2Fb/archive', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': 'archive-token' },
    });
  });

  it('US2-4: preserves backend conflict messages and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'BOOKING_CONFLICT', message: 'Equipment with an active reservation or loan cannot be archived.', details: null },
    }), { status: 409 })));
    await expect(archiveEquipment('uuid')).rejects.toMatchObject({
      status: 409, message: 'Equipment with an active reservation or loan cannot be archived.',
    });
  });

  it('US2-4: supplies a useful archive error for non-JSON failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad gateway', { status: 502 })));
    await expect(archiveEquipment('uuid')).rejects.toMatchObject({
      status: 502, message: 'Unable to archive equipment. Please try again.',
    });
  });
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

it('sends photo uploads and removals in one multipart update without overriding the browser boundary', async () => {
  const api = await import('./equipmentApi');
  const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ id: 'eq' }), { status: 200 }));
  const photo = new File(['image'], 'image.png', { type: 'image/png' });
  await api.updateEquipment('eq', { name: 'Camera' }, { files: [null, photo, null], removed: [1, 3] });
  const init = mock.mock.calls[0][1]!;
  expect(init.body).toBeInstanceOf(FormData);
  const data = init.body as FormData;
  expect(data.get('name')).toBe('Camera');
  expect(data.get('photo_2')).toBe(photo);
  expect(data.getAll('remove_photos')).toEqual(['1', '3']);
  expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
  mock.mockRestore();
});
