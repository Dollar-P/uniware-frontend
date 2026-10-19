import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CatalogPage from './CatalogPage';
import { listCategories, listEquipment, listLocations } from '../services/equipmentApi';
import { EquipmentError } from '../types/equipment';
import type { Equipment, Paginated } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';

vi.mock('../services/equipmentApi', () => ({ listEquipment: vi.fn(), listCategories: vi.fn(), listLocations: vi.fn() }));
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
function mount() { return render(<CatalogPage user={user} onLogout={vi.fn()} loggingOut={false} logoutError="" />); }
async function ready() {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Apply filters' })).toBeEnabled());
}
const apply = () => userEvent.click(screen.getByRole('button', { name: 'Apply filters' }));

beforeEach(() => {
  vi.mocked(listCategories).mockResolvedValue([item.category]);
  vi.mocked(listLocations).mockResolvedValue([item.location]);
  vi.mocked(listEquipment).mockResolvedValue(results);
});
afterEach(() => { vi.resetAllMocks(); window.history.replaceState(null, '', '/'); });

describe('US3-3 catalog filters', () => {
  it('loads backend reference choices and the two backend-supported availability options', async () => {
    mount();
    await ready();
    expect(screen.getByRole('option', { name: 'Lab' })).toHaveValue('cat');
    expect(screen.getByRole('option', { name: 'Building A' })).toHaveValue('loc');
    expect(screen.getByRole('option', { name: 'Available' })).toHaveValue('available');
    expect(screen.getByRole('option', { name: 'Unavailable' })).toHaveValue('unavailable');
    expect(screen.queryByRole('option', { name: 'Checked out' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Archived' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Disabled' })).not.toBeInTheDocument();
    expect(listCategories).toHaveBeenCalledOnce();
    expect(listLocations).toHaveBeenCalledOnce();
  });

  it.each([
    ['Category', 'cat', { category: 'cat' }],
    ['Location', 'loc', { location: 'loc' }],
    ['Availability (available)', 'available', { availability: 'available' }],
    ['Availability (unavailable)', 'unavailable', { availability: 'unavailable' }],
  ] as const)('applies %s independently only after submission', async (label, value, expected) => {
    mount();
    await ready();
    await userEvent.selectOptions(screen.getByLabelText(label.startsWith('Availability') ? 'Availability' : label), value);
    expect(listEquipment).toHaveBeenCalledOnce();
    await apply();
    await waitFor(() => expect(listEquipment).toHaveBeenLastCalledWith(1, expected));
    expect(await screen.findByText('1 item matching your filters')).toBeInTheDocument();
  });

  it('combines all filters, resets to page one, retains filters across pages and clears them', async () => {
    vi.mocked(listEquipment).mockResolvedValue({ ...results, count: 21, next: '/api/equipment?page=2' });
    mount();
    await ready();
    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(listEquipment).toHaveBeenLastCalledWith(2));
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'cat');
    await userEvent.selectOptions(screen.getByLabelText('Location'), 'loc');
    await userEvent.selectOptions(screen.getByLabelText('Availability'), 'available');
    await apply();
    const filters = { category: 'cat', location: 'loc', availability: 'available' };
    await waitFor(() => expect(listEquipment).toHaveBeenLastCalledWith(1, filters));
    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));
    await waitFor(() => expect(listEquipment).toHaveBeenLastCalledWith(2, filters));
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await waitFor(() => expect(listEquipment).toHaveBeenLastCalledWith(1));
    for (const label of ['Category', 'Location', 'Availability']) expect(screen.getByLabelText(label)).toHaveValue('');
    expect(await screen.findByText('21 items in the catalog')).toBeInTheDocument();
  });

  it('shows a distinct no-match state and can clear back to the whole catalog', async () => {
    vi.mocked(listEquipment).mockResolvedValueOnce(results).mockResolvedValueOnce(empty).mockResolvedValue(results);
    mount();
    await ready();
    await userEvent.selectOptions(screen.getByLabelText('Availability'), 'unavailable');
    await apply();
    expect(await screen.findByText('No equipment matches these filters')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'View Microscope' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(await screen.findByRole('link', { name: 'View Microscope' })).toBeInTheDocument();
  });

  it('blocks unknown values injected into a reference picker', async () => {
    mount();
    await ready();
    const select = screen.getByLabelText('Category');
    select.appendChild(new Option('Unknown category', 'unknown'));
    fireEvent.change(select, { target: { value: 'unknown' } });
    await apply();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose supported filter values');
    expect(listEquipment).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('blocks an unsupported availability option injected into the select', async () => {
    mount();
    await ready();
    const select = screen.getByLabelText('Availability');
    select.appendChild(new Option('Archived', 'ARCHIVED'));
    fireEvent.change(select, { target: { value: 'ARCHIVED' } });
    await apply();
    expect(screen.getByRole('alert')).toHaveTextContent('Choose supported filter values');
    expect(listEquipment).toHaveBeenCalledOnce();
  });

  it('surfaces a stale filter rejection and retains selections for retry or clearing', async () => {
    vi.mocked(listEquipment).mockResolvedValueOnce(results).mockRejectedValueOnce(new EquipmentError('Unknown category.', {}, 400)).mockResolvedValue(results);
    mount();
    await ready();
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'cat');
    await apply();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unknown category.');
    expect(screen.getByLabelText('Category')).toHaveValue('cat');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Microscope')).toBeInTheDocument();
    expect(listEquipment).toHaveBeenLastCalledWith(1, { category: 'cat' });
  });

  it('keeps catalog browsing available when reference loading fails and supports retry', async () => {
    vi.mocked(listCategories).mockRejectedValueOnce(new Error('Categories unavailable.')).mockResolvedValue([item.category]);
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('Categories unavailable.');
    expect(await screen.findByText('Microscope')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Apply filters' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Retry filter choices' }));
    await ready();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('supports empty category and location lists without inventing options', async () => {
    vi.mocked(listCategories).mockResolvedValue([]);
    vi.mocked(listLocations).mockResolvedValue([]);
    mount();
    await ready();
    expect(screen.queryByRole('option', { name: 'Lab' })).not.toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText('Availability'), 'available');
    await apply();
    await waitFor(() => expect(listEquipment).toHaveBeenLastCalledWith(1, { availability: 'available' }));
  });

  it('ignores a slow filtered response after clearing the filters', async () => {
    let finish!: (value: Paginated<Equipment>) => void;
    vi.mocked(listEquipment).mockResolvedValueOnce(results)
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(results);
    mount();
    await ready();
    await userEvent.selectOptions(screen.getByLabelText('Availability'), 'unavailable');
    await apply();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await screen.findByText('1 item in the catalog');
    await act(async () => { finish(empty); });
    expect(screen.getByText('Microscope')).toBeInTheDocument();
    expect(screen.queryByText('No equipment matches these filters')).not.toBeInTheDocument();
  });

  it('redirects to sign in when reference loading detects an expired session', async () => {
    vi.mocked(listLocations).mockRejectedValue(new EquipmentError('Expired', {}, 401));
    mount();
    await waitFor(() => expect(window.location.hash).toBe('#login'));
  });
});
