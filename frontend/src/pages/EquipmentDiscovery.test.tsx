import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import CatalogPage from './CatalogPage';
import EquipmentDetailPage from './EquipmentDetailPage';
import * as api from '../services/equipmentApi';
import * as session from '../services/sessionApi';
import { EquipmentError } from '../types/equipment';
import type { Equipment } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';

const user: RegisterResponse = {
  id: 'user', email: 'user@chula.ac.th', first_name: 'Test', last_name: 'User', department: '',
  is_admin: false, is_provider: false, is_borrower: true, account_status: 'ACTIVE', date_joined: '',
};
const item: Equipment = {
  id: 'eq-1', asset_id: 'ASSET-1', name: 'Microscope', model: 'MX-5', description: 'A lab microscope',
  provider: 'provider', category: { id: 'cat', name: 'Lab' }, location: { id: 'loc', name: 'Building A' },
  status: 'MAINTENANCE', archived_at: null, disabled_at: null, created_at: '', updated_at: '',
};
const result = { results: [item], count: 21, next: '/api/equipment?page=2', previous: null };
const catalog = <CatalogPage user={user} onLogout={vi.fn()} loggingOut={false} logoutError="" />;

describe('equipment discovery integration', () => {
  beforeEach(() => { window.history.replaceState(null, '', '/'); });
  afterEach(() => { vi.restoreAllMocks(); });
  it('shows readable status, full count, detail link and server pagination', async () => {
    const list = vi.spyOn(api, 'listEquipment').mockResolvedValueOnce(result).mockResolvedValueOnce({
      ...result, results: [{ ...item, id: 'eq-2', name: 'Camera' }], next: null,
    });
    render(catalog);
    expect(await screen.findByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('21 items in the catalog')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Microscope' })).toHaveAttribute('href', '#equipment/eq-1');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Camera')).toBeInTheDocument();
    expect(screen.queryByText('Microscope')).not.toBeInTheDocument();
    expect(list).toHaveBeenLastCalledWith(2);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
  it('shows an empty catalog', async () => {
    vi.spyOn(api, 'listEquipment').mockResolvedValue({ results: [], count: 0, next: null, previous: null });
    render(catalog);
    expect(await screen.findByText('No equipment to show')).toBeInTheDocument();
  });
  it('retries catalog errors and retains logout error feedback', async () => {
    vi.spyOn(api, 'listEquipment').mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(result);
    render(<CatalogPage user={user} onLogout={vi.fn()} loggingOut={false} logoutError="Logout failed" />);
    expect(await screen.findByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Logout failed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Microscope')).toBeInTheDocument();
  });
  it('connects account, catalog, detail, and back navigation', async () => {
    window.location.hash = 'account';
    vi.spyOn(session, 'currentUser').mockResolvedValue(user);
    vi.spyOn(api, 'listEquipment').mockResolvedValue(result);
    vi.spyOn(api, 'getEquipment').mockResolvedValue(item);
    render(<App />);
    await userEvent.click(await screen.findByRole('link', { name: 'Browse equipment' }));
    await userEvent.click(await screen.findByRole('link', { name: 'View Microscope' }));
    expect(await screen.findByRole('heading', { name: 'Microscope' })).toBeInTheDocument();
    expect(screen.getByText('A lab microscope')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: 'Back to catalog' }));
    expect(await screen.findByRole('link', { name: 'View Microscope' })).toBeInTheDocument();
  });
  it.each(['catalog', 'equipment/eq-1', 'my-equipment'])('protects #%s from anonymous access', async route => {
    window.location.hash = route;
    vi.spyOn(session, 'currentUser').mockResolvedValue(null);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
  it('keeps session failures on a protected route with retry', async () => {
    window.location.hash = 'catalog';
    vi.spyOn(session, 'currentUser').mockRejectedValue(new Error('Offline'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('could not check your session');
    expect(screen.queryByRole('heading', { name: 'Sign up' })).not.toBeInTheDocument();
  });
  it('shows not found for hidden or missing equipment', async () => {
    vi.spyOn(api, 'getEquipment').mockRejectedValue(new EquipmentError('Not found', {}, 404));
    render(<EquipmentDetailPage equipmentId="missing" />);
    expect(await screen.findByRole('heading', { name: 'Equipment not found' })).toBeInTheDocument();
  });
  it('does not crash on malformed encoded detail routes', async () => {
    window.location.hash = 'equipment/%';
    vi.spyOn(session, 'currentUser').mockResolvedValue(user);
    const get = vi.spyOn(api, 'getEquipment');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Equipment not found' })).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });
  it('retries details after a server failure', async () => {
    vi.spyOn(api, 'getEquipment').mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(item);
    render(<EquipmentDetailPage equipmentId={item.id} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('A lab microscope')).toBeInTheDocument();
  });
  it('ignores an old detail response when navigating to another item', async () => {
    let finish!: (value: Equipment) => void;
    vi.spyOn(api, 'getEquipment')
      .mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce({ ...item, id: 'new', name: 'Camera' });
    const { rerender } = render(<EquipmentDetailPage equipmentId="old" />);
    rerender(<EquipmentDetailPage equipmentId="new" />);
    expect(await screen.findByRole('heading', { name: 'Camera' })).toBeInTheDocument();
    await act(async () => { finish(item); });
    expect(screen.queryByText('Microscope')).not.toBeInTheDocument();
  });
});
