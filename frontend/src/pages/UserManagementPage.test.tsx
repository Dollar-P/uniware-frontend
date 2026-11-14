import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserManagementPage from './UserManagementPage';
import { listUsers, updateUserRoles, updateUserStatus } from '../services/userManagementApi';
import type { RegisterResponse } from '../types/auth';

vi.mock('../services/userManagementApi', () => ({
  listUsers: vi.fn(), updateUserRoles: vi.fn(), updateUserStatus: vi.fn(),
}));

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
  vi.mocked(listUsers).mockResolvedValue([admin, borrower]);
  vi.mocked(updateUserStatus).mockImplementation(async (_, account_status) => ({ ...borrower, account_status }));
  vi.mocked(updateUserRoles).mockResolvedValue(borrower);
});

describe('admin suspension controls', () => {
  it('suspends a borrower after confirmation and can reactivate them', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<UserManagementPage user={admin} />);
    const suspend = await screen.findByRole('button', { name: 'Suspend' });
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
    await userEvent.click(await screen.findByRole('button', { name: 'Suspend' }));
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
