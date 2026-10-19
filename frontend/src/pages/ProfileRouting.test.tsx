import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import * as session from '../services/sessionApi';
import * as api from '../services/profileApi';
import type { Profile } from '../types/profile';

const profile: Profile = { id: 'u', email: 'pat@chula.ac.th', first_name: 'Pat', last_name: 'User',
  department: 'Engineering', is_borrower: true, is_provider: false, is_admin: false, account_status: 'ACTIVE', date_joined: '' };

afterEach(() => { vi.restoreAllMocks(); window.history.replaceState(null, '', '/'); });

describe('profile routing and session checks', () => {
  it('protects the profile route from anonymous access', async () => {
    window.location.hash = 'profile';
    vi.spyOn(session, 'currentUser').mockResolvedValue(null);
    const get = vi.spyOn(api, 'getProfile');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it('opens from the account and preserves an edit while the session rechecks on focus', async () => {
    window.location.hash = 'account';
    const check = vi.spyOn(session, 'currentUser').mockResolvedValue(profile);
    vi.spyOn(api, 'getProfile').mockResolvedValue(profile);
    render(<App />);
    await userEvent.click(await screen.findByRole('link', { name: 'View and edit profile' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Edit profile' }));
    await userEvent.type(screen.getByLabelText('First name'), ' Draft');
    const calls = check.mock.calls.length;
    act(() => window.dispatchEvent(new Event('focus')));
    await waitFor(() => expect(check.mock.calls.length).toBeGreaterThan(calls));
    expect(screen.getByLabelText('First name')).toHaveValue('Pat Draft');
    expect(document.title).toBe('Your profile · UniWare');
  });
});
