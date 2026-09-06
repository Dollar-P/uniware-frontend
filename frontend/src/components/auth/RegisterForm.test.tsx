import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterForm from './RegisterForm';
import { registerUser } from '../../services/authApi';
import { RegistrationError } from '../../types/auth';
vi.mock('../../services/authApi', () => ({ registerUser: vi.fn() }));
const mockedRegisterUser = vi.mocked(registerUser);
async function fillForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('First name'), ' Putter ');
  await user.type(screen.getByLabelText('Last name'), 'Smith');
  await user.type(screen.getByLabelText('University Email'), 'PUTTER@chula.ac.th');
  await user.type(screen.getByLabelText('Password'), 'unusual phrase here');
  return user;
}
describe('RegisterForm', () => {
  beforeEach(() => { mockedRegisterUser.mockReset(); });
  it('submits backend fields and accepts a bare user response', async () => {
    mockedRegisterUser.mockResolvedValue({
      id: 'user-1', first_name: 'Putter', last_name: 'Smith', email: 'putter@chula.ac.th',
      department: '', is_admin: false, is_provider: false, is_borrower: true,
      account_status: 'ACTIVE', date_joined: '2026-09-06T00:00:00Z',
    });
    render(<RegisterForm />);
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(mockedRegisterUser).toHaveBeenCalledWith({
      first_name: 'Putter', last_name: 'Smith', email: 'putter@chula.ac.th',
      password: 'unusual phrase here', department: '',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Registration successful');
    expect(screen.getByLabelText('First name')).toHaveValue('');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });
  it('displays server field errors and preserves input', async () => {
    mockedRegisterUser.mockRejectedValue(new RegistrationError('Invalid registration.', {
      password: 'This password is too common.',
    }));
    render(<RegisterForm />);
    const user = await fillForm();
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid registration.');
    expect(screen.getByText('This password is too common.')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Last name')).toHaveValue('Smith');
  });
  it('blocks missing required fields', async () => {
    render(<RegisterForm />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(mockedRegisterUser).not.toHaveBeenCalled();
  });
});
