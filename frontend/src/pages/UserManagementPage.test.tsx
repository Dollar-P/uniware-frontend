import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserManagementPage from './UserManagementPage';
import { listUsers, updateUserRoles, updateUserStatus } from '../services/userManagementApi';
import type { RegisterResponse } from '../types/auth';

vi.mock('../services/userManagementApi', () => ({
  listUsers: vi.fn(), updateUserRoles: vi.fn(), updateUserStatus: vi.fn(),
}));

const pageOf = (results: RegisterResponse[]) => ({ count: results.length, results, next: null, previous: null });

const admin: RegisterResponse = {
  id: 'admin', email: 'admin@chula.ac.th', first_name: 'Admin', last_name: 'User',
  department: '', is_admin: true, is_provider: false, is_borrower: true,
  account_status: 'ACTIVE', date_joined: '2026-01-01',
};
const borrower: RegisterResponse = {
  ...admin, id: 'borrower', email: 'borrower@chula.ac.th', first_name: 'Borrower',
  is_admin: false, account_status: 'ACTIVE',
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(listUsers).mockResolvedValue(pageOf([admin, borrower]));
  vi.mocked(updateUserStatus).mockImplementation(async (_, account_status) => ({ ...borrower, account_status }));
  vi.mocked(updateUserRoles).mockResolvedValue(borrower);
});

describe('admin suspension controls', () => {
  it('suspends a borrower after confirmation and can reactivate them', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<UserManagementPage user={admin} />);
    const row = await screen.findByRole('row', { name: /borrower@chula.ac.th/ });
    const suspend = within(row).getByRole('button', { name: 'Suspend' });
    await userEvent.click(suspend);
    await waitFor(() => expect(updateUserStatus).toHaveBeenCalledWith('borrower', 'SUSPENDED'));
    expect(await screen.findByText('Suspended')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reactivate' }));
    await waitFor(() => expect(updateUserStatus).toHaveBeenCalledWith('borrower', 'ACTIVE'));
    vi.restoreAllMocks();
  });

  it('does not suspend without confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<UserManagementPage user={admin} />);
    const row = await screen.findByRole('row', { name: /borrower@chula.ac.th/ });
    await userEvent.click(within(row).getByRole('button', { name: 'Suspend' }));
    expect(updateUserStatus).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('disables the administrator own suspend button', async () => {
    render(<UserManagementPage user={admin} />);
    await screen.findByText('borrower@chula.ac.th');
    const actions = screen.getAllByRole('button', { name: 'Suspend' });
    expect(actions).toHaveLength(2);
    expect(actions[0]).toBeDisabled();
    expect(actions[1]).toBeEnabled();
  });
});

describe('US8-1 user search', () => {
  const provider: RegisterResponse = {
    ...borrower, id: 'provider', email: 'pat.provider@chula.ac.th', first_name: 'Pat', last_name: 'Somchai', is_provider: true,
  };
  beforeEach(() => { vi.mocked(listUsers).mockImplementation(async (_page, search = '') => pageOf([admin, borrower, provider].filter(user => `${user.first_name} ${user.last_name} ${user.email}`.toLowerCase().includes(search.toLowerCase())))); });

  it('filters the list by part of a name, ignoring letter case', async () => {
    render(<UserManagementPage user={admin} />);
    await screen.findByText('borrower@chula.ac.th');
    await userEvent.type(screen.getByLabelText('Search name or email'), 'SOMCH');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByText('1 accounts');
    expect(screen.getByText('pat.provider@chula.ac.th')).toBeInTheDocument();
    expect(screen.queryByText('borrower@chula.ac.th')).not.toBeInTheDocument();
    expect(screen.queryByText('admin@chula.ac.th')).not.toBeInTheDocument();
    expect(screen.getByText('1 accounts')).toBeInTheDocument();
  });

  it('filters the list by part of an email', async () => {
    render(<UserManagementPage user={admin} />);
    await screen.findByText('borrower@chula.ac.th');
    await userEvent.type(screen.getByLabelText('Search name or email'), 'borrower@');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByText('1 accounts');
    expect(screen.getByText('borrower@chula.ac.th')).toBeInTheDocument();
    expect(screen.queryByText('pat.provider@chula.ac.th')).not.toBeInTheDocument();
  });

  it('says when nobody matches and shows everyone again once the search is cleared', async () => {
    render(<UserManagementPage user={admin} />);
    await screen.findByText('borrower@chula.ac.th');
    await userEvent.type(screen.getByLabelText('Search name or email'), 'zzz-nobody');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await screen.findByText('0 accounts');
    expect(screen.getByText('No users match "zzz-nobody".')).toBeInTheDocument();
    expect(screen.queryByText('borrower@chula.ac.th')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(await screen.findByText('borrower@chula.ac.th')).toBeInTheDocument();
    expect(screen.getByText('pat.provider@chula.ac.th')).toBeInTheDocument();
    expect(screen.queryByText(/No users match/)).not.toBeInTheDocument();
  });

  it('waits for search submission before requesting results', async () => {
    render(<UserManagementPage user={admin} />);
    await screen.findByText('borrower@chula.ac.th');
    await userEvent.type(screen.getByLabelText('Search name or email'), 'pat');
    expect(listUsers).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(listUsers).toHaveBeenLastCalledWith(1, 'pat'));
  });
});

describe('US8-2 role change confirmation', () => {
  it('asks before changing a role and saves it once confirmed', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(updateUserRoles).mockResolvedValue({ ...borrower, is_provider: true });
    render(<UserManagementPage user={admin} />);
    const row = await screen.findByRole('row', { name: /borrower@chula.ac.th/ });
    await userEvent.click(within(row).getByLabelText('Provider'));
    expect(confirm).toHaveBeenCalledWith('Grant the Provider role to Borrower User (borrower@chula.ac.th)?');
    await waitFor(() => expect(updateUserRoles).toHaveBeenCalledWith('borrower', { is_provider: true }));
    expect(await screen.findByText('Updated roles for borrower@chula.ac.th.')).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('leaves the role unchanged when the admin cancels', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<UserManagementPage user={admin} />);
    const row = await screen.findByRole('row', { name: /borrower@chula.ac.th/ });
    await userEvent.click(within(row).getByLabelText('Provider'));
    expect(updateUserRoles).not.toHaveBeenCalled();
    expect(within(row).getByLabelText('Provider')).not.toBeChecked();
    vi.restoreAllMocks();
  });
});

describe('US8-3 reactivation confirmation', () => {
  it('does not reactivate an account without confirmation', async () => {
    vi.mocked(listUsers).mockResolvedValue(pageOf([admin, { ...borrower, account_status: 'SUSPENDED' }]));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<UserManagementPage user={admin} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Reactivate' }));
    expect(updateUserStatus).not.toHaveBeenCalled();
    expect(screen.getByText('Suspended')).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});

describe('user list load failure', () => {
  it('shows the error with a retry instead of an empty table', async () => {
    vi.mocked(listUsers).mockRejectedValueOnce(new Error('Server unavailable'));
    render(<UserManagementPage user={admin} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('No user accounts found.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('borrower@chula.ac.th')).toBeInTheDocument();
  });
});
