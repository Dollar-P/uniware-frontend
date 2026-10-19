import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from './ProfilePage';
import * as api from '../services/profileApi';
import { ProfileError } from '../types/profile';
import type { Profile } from '../types/profile';
const profile: Profile = { id: 'u', email: 'pat@chula.ac.th', first_name: 'Pat', last_name: 'User',
  department: 'Engineering', is_borrower: true, is_provider: false, is_admin: false, account_status: 'ACTIVE', date_joined: '' };
describe('profile page', () => {
  afterEach(() => { vi.restoreAllMocks(); });
  async function open() {
    vi.spyOn(api, 'getProfile').mockResolvedValue(profile);
    const onSaved = vi.fn();
    render(<ProfilePage onSaved={onSaved} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Edit profile' }));
    return onSaved;
  }
  it('shows restricted fields as text and pre-fills only editable inputs', async () => {
    await open();
    expect(screen.getByText(profile.email)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'University Email' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
    expect(screen.getByLabelText('First name')).toHaveValue('Pat');
    expect(screen.getByLabelText('Department (optional)')).toHaveValue('Engineering');
  });
  it('saves valid changes and refreshes displayed profile data', async () => {
    const save = vi.spyOn(api, 'updateProfile').mockResolvedValue({ ...profile, first_name: 'New' });
    const onSaved = await open();
    await userEvent.clear(screen.getByLabelText('First name'));
    await userEvent.type(screen.getByLabelText('First name'), 'New');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Your profile has been saved');
    expect(save).toHaveBeenCalledWith({ first_name: 'New', last_name: 'User', department: 'Engineering' });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ first_name: 'New' }));
  });
  it('rejects invalid names without sending an update', async () => {
    const save = vi.spyOn(api, 'updateProfile');
    await open();
    await userEvent.clear(screen.getByLabelText('First name'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('This name is required.')).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
  it('retains the draft on server rejection and Cancel restores saved data', async () => {
    vi.spyOn(api, 'updateProfile').mockRejectedValue(new ProfileError('Invalid profile.', 400, { first_name: 'Name rejected.' }));
    await open();
    await userEvent.type(screen.getByLabelText('First name'), ' Draft');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid profile.');
    expect(screen.getByLabelText('First name')).toHaveValue('Pat Draft');
    expect(screen.getByText('Name rejected.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Pat')).toBeInTheDocument();
    expect(screen.queryByText('Pat Draft')).not.toBeInTheDocument();
  });
  it('offers retry for a failed profile load', async () => {
    vi.spyOn(api, 'getProfile').mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(profile);
    render(<ProfilePage onSaved={vi.fn()} />);
    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(profile.email)).toBeInTheDocument();
  });
});
