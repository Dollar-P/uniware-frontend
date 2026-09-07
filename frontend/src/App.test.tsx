import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { currentUser, login } from './services/sessionApi';
import type { RegisterResponse } from './types/auth';
vi.mock('./services/sessionApi', () => ({ currentUser: vi.fn(), login: vi.fn() }));
const account: RegisterResponse = {
  id: 'uuid', email: 'user@chula.ac.th', first_name: 'Test', last_name: 'User',
  department: '', is_admin: false, is_provider: true, is_borrower: true,
  account_status: 'ACTIVE', date_joined: '',
};
describe('session navigation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    window.history.replaceState(null, '', '/');
    vi.mocked(currentUser).mockResolvedValue(null);
  });
  it('opens two-field sign in from sign up and signs in', async () => {
    render(<App />);
    const link = await screen.findByRole('link', { name: 'Sign in' });
    expect(screen.getByText('if you already have registered an account')).toBeInTheDocument();
    await userEvent.click(link);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByLabelText('First name')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('University Email'), account.email);
    await userEvent.type(screen.getByLabelText('Password'), 'correct password');
    vi.mocked(login).mockResolvedValue(account);
    vi.mocked(currentUser).mockResolvedValue(account);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Welcome, Test')).toBeInTheDocument();
    expect(screen.getByText('Borrower, Provider')).toBeInTheDocument();
  });
  it('restores a real session on direct account navigation', async () => {
    window.location.hash = 'account';
    vi.mocked(currentUser).mockResolvedValue(account);
    render(<App />);
    expect(await screen.findByText('Welcome, Test')).toBeInTheDocument();
  });
  it('redirects anonymous visitors away from the protected page', async () => {
    window.location.hash = 'account';
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('Welcome, Test')).not.toBeInTheDocument();
  });
  it('removes protected content when the session expires', async () => {
    window.location.hash = 'account';
    vi.mocked(currentUser).mockResolvedValue(account);
    render(<App />);
    await screen.findByText('Welcome, Test');
    vi.mocked(currentUser).mockResolvedValue(null);
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('Welcome, Test')).not.toBeInTheDocument();
  });
  it('shows retry on service failure without exposing account content', async () => {
    window.location.hash = 'account';
    vi.mocked(currentUser).mockRejectedValue(new Error('offline'));
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('could not check your session');
    vi.mocked(currentUser).mockResolvedValue(account);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Welcome, Test')).toBeInTheDocument());
  });
});
