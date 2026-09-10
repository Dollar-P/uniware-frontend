import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';
import { login } from '../../services/sessionApi';
vi.mock('../../services/sessionApi', () => ({ login: vi.fn() }));
describe('LoginForm', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('requires both fields without requesting login', async () => {
    render(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByText('University email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
  it('shows invalid credentials and permits retry', async () => {
    vi.mocked(login).mockRejectedValue(new Error('Invalid email or password.'));
    render(<LoginForm onSuccess={vi.fn()} />);
    await userEvent.type(screen.getByLabelText('University Email'), 'person@chula.ac.th');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });
});
