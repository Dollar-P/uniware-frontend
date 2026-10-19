import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CatalogPage from './CatalogPage';
import { listCategories, listEquipment, listLocations } from '../services/equipmentApi';
import { EquipmentError } from '../types/equipment';
import type { Equipment, Paginated } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';

vi.mock('../services/equipmentApi', () => ({
  listEquipment: vi.fn(), listCategories: vi.fn(), listLocations: vi.fn(),
}));
const user: RegisterResponse = {
  id: 'u1', email: 'user@chula.ac.th', first_name: 'Test', last_name: 'User', department: '',
  is_admin: false, is_provider: false, is_borrower: true, account_status: 'ACTIVE', date_joined: '',
};
const item: Equipment = {
  id: 'eq-1', asset_id: 'A-1', name: 'Microscope', model: 'MX-5', description: '', provider: 'p1',
  category: { id: 'cat', name: 'Lab' }, location: { id: 'loc', name: 'Building A' },
  status: 'AVAILABLE', archived_at: null, disabled_at: null, created_at: '', updated_at: '',
};
const results: Paginated<Equipment> = { results: [item], count: 1, next: null, previous: null };
const empty = { ...results, results: [], count: 0 };
function mount() {
  return render(<CatalogPage user={user} onLogout={vi.fn()} loggingOut={false} logoutError="" />);
}
async function search(value: string) {
  await userEvent.clear(screen.getByRole('searchbox'));
  await userEvent.type(screen.getByRole('searchbox'), value);
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));
}
beforeEach(() => {
  vi.mocked(listCategories).mockResolvedValue([item.category]);
  vi.mocked(listLocations).mockResolvedValue([item.location]);
});
afterEach(() => { vi.resetAllMocks(); window.history.replaceState(null, '', '/'); });

describe('US3-2 catalog search', () => {
  it.each(['Microscope', 'micro', 'MICRO', 'MX-5', 'mx'])('renders server results for name/model query %s', async query => {
    vi.mocked(listEquipment).mockResolvedValueOnce(empty).mockResolvedValue(results);
    mount();
    await screen.findByText('No equipment to show');
    await search(query);
    expect(await screen.findByRole('link', { name: 'View Microscope' })).toBeInTheDocument();
    expect(listEquipment).toHaveBeenLastCalledWith(1, { search: query });
    expect(screen.getByRole('status')).toHaveTextContent(`1 item matching “${query}”`);
  });

  it('waits for submission, resets pagination and retains the query on the next page', async () => {
    vi.mocked(listEquipment).mockResolvedValue({ ...results, count: 21, next: '/api/equipment?page=2' });
    mount();
    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(listEquipment).toHaveBeenLastCalledWith(2));
    await userEvent.type(screen.getByRole('searchbox'), '  micro  ');
    expect(listEquipment).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(listEquipment).toHaveBeenLastCalledWith(1, { search: 'micro' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(listEquipment).toHaveBeenLastCalledWith(2, { search: 'micro' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    await waitFor(() => expect(listEquipment).toHaveBeenLastCalledWith(1));
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('distinguishes no matches from an empty catalog and treats whitespace as browsing', async () => {
    vi.mocked(listEquipment).mockResolvedValueOnce(results).mockResolvedValue(empty);
    mount();
    await screen.findByText('Microscope');
    await search('not-found');
    expect(await screen.findByText('No matching equipment')).toBeInTheDocument();
    expect(screen.queryByText('Microscope')).not.toBeInTheDocument();
    await search('   ');
    expect(await screen.findByText('No equipment to show')).toBeInTheDocument();
    expect(listEquipment).toHaveBeenLastCalledWith(1);
  });

  it('renders only the visible results returned by the catalog, not cached inventory', async () => {
    // The backend must omit matching archived/disabled items and count only visible items.
    vi.mocked(listEquipment).mockResolvedValue(results);
    mount();
    await search('micro');
    expect(await screen.findByRole('link', { name: 'View Microscope' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^View / })).toHaveLength(1);
    expect(screen.queryByText('Archived')).not.toBeInTheDocument();
    expect(screen.queryByText('Disabled')).not.toBeInTheDocument();
  });

  it('retries the same query without erasing input on a focus event', async () => {
    vi.mocked(listEquipment).mockResolvedValueOnce(results).mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(results);
    mount();
    await screen.findByText('Microscope');
    await search('MX');
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
    act(() => window.dispatchEvent(new Event('focus')));
    expect(screen.getByRole('searchbox')).toHaveValue('MX');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Microscope')).toBeInTheDocument();
    expect(listEquipment).toHaveBeenLastCalledWith(1, { search: 'MX' });
  });

  it('ignores a slow response for a previous query', async () => {
    let finish!: (value: Paginated<Equipment>) => void;
    vi.mocked(listEquipment).mockResolvedValueOnce(empty)
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(empty);
    mount();
    await screen.findByText('No equipment to show');
    await search('micro');
    await search('camera');
    await screen.findByText('No matching equipment');
    await act(async () => { finish(results); });
    expect(screen.queryByText('Microscope')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('“camera”');
  });

  it('redirects to sign in when the session expires during search', async () => {
    vi.mocked(listEquipment).mockResolvedValueOnce(results).mockRejectedValue(new EquipmentError('Expired', {}, 401));
    mount();
    await screen.findByText('Microscope');
    await search('micro');
    await waitFor(() => expect(window.location.hash).toBe('#login'));
  });
});
