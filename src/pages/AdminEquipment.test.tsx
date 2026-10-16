import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminEquipmentPage from './AdminEquipmentPage';
import App from '../App';
import { disableEquipment, enableEquipment, listAdminEquipment } from '../services/equipmentApi';
import { currentUser } from '../services/sessionApi';
import { EquipmentError } from '../types/equipment';
import type { AdminEquipment } from '../types/equipment';
import type { RegisterResponse } from '../types/auth';

vi.mock('../services/equipmentApi', () => ({
  listAdminEquipment: vi.fn(), disableEquipment: vi.fn(), enableEquipment: vi.fn(),
}));
vi.mock('../services/sessionApi', () => ({ currentUser: vi.fn(), logout: vi.fn() }));

const admin: RegisterResponse = {
  id: 'admin-1', email: 'admin@chula.ac.th', first_name: 'Ada', last_name: 'Admin',
  department: 'Engineering', is_admin: true, is_provider: false, is_borrower: false,
  account_status: 'ACTIVE', date_joined: '2026-01-01T00:00:00Z',
};
const borrower: RegisterResponse = { ...admin, id: 'borrower-1', email: 'borrower1@chula.ac.th', is_admin: false, is_borrower: true };

function makeListing(overrides: Partial<AdminEquipment> = {}): AdminEquipment {
  return {
    id: 'eq-1', asset_id: 'EQ-1001', name: 'Oscilloscope', model: 'DS1054Z',
    description: 'Four-channel digital oscilloscope', provider: 'provider-1',
    category: { id: 'cat-1', name: 'Electronics' }, location: { id: 'loc-1', name: 'Engineering Lab' },
    status: 'AVAILABLE', archived_at: null, disabled_at: null, disabled_reason: '',
    created_at: '2026-10-01T09:00:00Z', updated_at: '2026-10-01T09:00:00Z', ...overrides,
  };
}
function paginate(results: AdminEquipment[], next: string | null = null) {
  return { count: results.length, next, previous: null, results };
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listAdminEquipment).mockResolvedValue(paginate([makeListing()]));
});

describe('US8-4 admin equipment moderation', () => {
  it('lists every listing, disabled ones included, with the reason on the record', async () => {
    vi.mocked(listAdminEquipment).mockResolvedValue(paginate([
      makeListing(),
      makeListing({
        id: 'eq-2', asset_id: 'EQ-1002', name: 'Fake Drone', status: 'DISABLED',
        disabled_at: '2026-10-15T10:00:00Z', disabled_reason: 'Photos do not match the asset',
      }),
    ]));
    render(<AdminEquipmentPage user={admin} />);

    expect(await screen.findByRole('heading', { name: 'Fake Drone' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
    expect(screen.getByText('Disabled: Photos do not match the asset')).toBeInTheDocument();
    expect(screen.getByText('2 listings, disabled ones included')).toBeInTheDocument();
  });

  it('asks for a reason before disabling and never calls the API on cancel', async () => {
    render(<AdminEquipmentPage user={admin} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Disable Oscilloscope' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Oscilloscope');
    // The confirm button stays out of reach until a reason is typed.
    expect(screen.getByRole('button', { name: 'Confirm disable' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(disableEquipment).not.toHaveBeenCalled();
  });

  it('disables a listing with the typed reason and reports it is hidden from borrowers', async () => {
    vi.mocked(disableEquipment).mockResolvedValue(makeListing({
      status: 'DISABLED', disabled_at: '2026-10-16T08:00:00Z', disabled_reason: 'Misleading description',
    }));
    render(<AdminEquipmentPage user={admin} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Disable Oscilloscope' }));
    await userEvent.type(screen.getByLabelText('Reason (required)'), 'Misleading description');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm disable' }));

    await waitFor(() => expect(disableEquipment).toHaveBeenCalledWith('eq-1', 'Misleading description'));
    expect(await screen.findByRole('status')).toHaveTextContent('Oscilloscope is no longer visible to borrowers.');
    // The row updates in place: the record is still listed, now as disabled.
    expect(screen.getByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText('Disabled: Misleading description')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('trims the reason, so whitespace alone cannot pass as one', async () => {
    vi.mocked(disableEquipment).mockResolvedValue(makeListing({ status: 'DISABLED', disabled_reason: 'Misleading' }));
    render(<AdminEquipmentPage user={admin} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Disable Oscilloscope' }));
    await userEvent.type(screen.getByLabelText('Reason (required)'), '    ');

    expect(screen.getByRole('button', { name: 'Confirm disable' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Reason (required)'), '  Misleading  ');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm disable' }));
    await waitFor(() => expect(disableEquipment).toHaveBeenCalledWith('eq-1', 'Misleading'));
  });

  it('keeps the dialog open and shows the server message when disabling fails', async () => {
    vi.mocked(disableEquipment).mockRejectedValue(
      new EquipmentError('A listing that is archived is already out of the borrower catalog.', {}, 409),
    );
    render(<AdminEquipmentPage user={admin} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Disable Oscilloscope' }));
    await userEvent.type(screen.getByLabelText('Reason (required)'), 'Misleading');
    await userEvent.click(screen.getByRole('button', { name: 'Confirm disable' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('already out of the borrower catalog');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('re-enables a disabled listing without asking for a reason', async () => {
    vi.mocked(listAdminEquipment).mockResolvedValue(paginate([makeListing({
      status: 'DISABLED', disabled_at: '2026-10-15T10:00:00Z', disabled_reason: 'Misleading description',
    })]));
    vi.mocked(enableEquipment).mockResolvedValue(makeListing());
    render(<AdminEquipmentPage user={admin} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Re-enable Oscilloscope' }));

    await waitFor(() => expect(enableEquipment).toHaveBeenCalledWith('eq-1'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent('Oscilloscope is back in the catalog as available.');
    expect(screen.getByRole('button', { name: 'Disable Oscilloscope' })).toBeInTheDocument();
  });

  it('reports a failed re-enable without changing the row', async () => {
    vi.mocked(listAdminEquipment).mockResolvedValue(paginate([makeListing({ status: 'DISABLED', disabled_reason: 'Misleading' })]));
    vi.mocked(enableEquipment).mockRejectedValue(new EquipmentError('This listing is not disabled.', {}, 409));
    render(<AdminEquipmentPage user={admin} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Re-enable Oscilloscope' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This listing is not disabled.');
    expect(screen.getByRole('button', { name: 'Re-enable Oscilloscope' })).toBeInTheDocument();
  });

  it('shows loading, empty and error states', async () => {
    vi.mocked(listAdminEquipment).mockReturnValue(new Promise(() => {}));
    const { unmount } = render(<AdminEquipmentPage user={admin} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading equipment listings...');
    unmount();

    vi.mocked(listAdminEquipment).mockResolvedValue(paginate([]));
    const empty = render(<AdminEquipmentPage user={admin} />);
    expect(await screen.findByRole('heading', { name: 'No listings to moderate' })).toBeInTheDocument();
    empty.unmount();

    vi.mocked(listAdminEquipment).mockRejectedValue(new EquipmentError('Unable to load the equipment listings.', {}, 500));
    render(<AdminEquipmentPage user={admin} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load the equipment listings.');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('pages through the listing', async () => {
    vi.mocked(listAdminEquipment).mockResolvedValue(paginate([makeListing()], '/api/admin/equipment?page=2'));
    render(<AdminEquipmentPage user={admin} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Next' }));

    await waitFor(() => expect(listAdminEquipment).toHaveBeenLastCalledWith(2));
  });
});

describe('US8-4 only an admin reaches the moderation surface', () => {
  it('shows the denied state without calling the API for a non-admin', async () => {
    render(<AdminEquipmentPage user={borrower} />);

    expect(await screen.findByRole('heading', { name: 'Admin access required' })).toBeInTheDocument();
    expect(listAdminEquipment).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^Disable/ })).not.toBeInTheDocument();
  });

  it('falls back to the denied state when the server refuses the capability', async () => {
    vi.mocked(listAdminEquipment).mockRejectedValue(
      new EquipmentError('This action requires admin capability.', {}, 403),
    );
    render(<AdminEquipmentPage user={admin} />);

    expect(await screen.findByRole('heading', { name: 'Admin access required' })).toBeInTheDocument();
  });

  it('offers the moderation link on the account page only to an admin', async () => {
    vi.mocked(currentUser).mockResolvedValue(admin);
    window.location.hash = 'account';
    const asAdmin = render(<App />);
    expect(await screen.findByRole('link', { name: 'Moderate equipment listings' }))
      .toHaveAttribute('href', '#admin-equipment');
    asAdmin.unmount();

    vi.mocked(currentUser).mockResolvedValue(borrower);
    render(<App />);
    await screen.findByRole('heading', { name: `Welcome, ${borrower.first_name}` });
    expect(screen.queryByRole('link', { name: 'Moderate equipment listings' })).not.toBeInTheDocument();
  });

  it('routes #admin-equipment to the moderation page for a signed-in admin', async () => {
    vi.mocked(currentUser).mockResolvedValue(admin);
    window.location.hash = 'admin-equipment';
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Equipment moderation' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Oscilloscope' })).toBeInTheDocument();
  });
});
