import { useState } from 'react';
import type { FormEvent } from 'react';
import { login } from '../../services/sessionApi';
import type { RegisterResponse } from '../../types/auth';

export default function LoginForm({ onSuccess }: { onSuccess: (user: RegisterResponse) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const nextErrors: typeof errors = {};
    if (!email.trim()) nextErrors.email = 'University email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address';
    if (!password) nextErrors.password = 'Password is required';
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length) return;
    setBusy(true);
    try {
      const user = await login({ email, password });
      setPassword('');
      onSuccess(user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="register-form" onSubmit={submit} noValidate aria-busy={busy}>
      <div className="form-field">
        <label htmlFor="login-email">University Email</label>
        <input id="login-email" type="email" name="email" autoComplete="username" required
          value={email} onChange={event => setEmail(event.target.value)} disabled={busy}
          aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'login-email-error' : undefined} />
        {errors.email && <p className="form-error" id="login-email-error">{errors.email}</p>}
      </div>
      <div className="form-field">
        <label htmlFor="login-password">Password</label>
        <input id="login-password" type="password" name="password" autoComplete="current-password" required
          value={password} onChange={event => setPassword(event.target.value)} disabled={busy}
          aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} />
        {errors.password && <p className="form-error" id="login-password-error">{errors.password}</p>}
      </div>
      {error && <p className="form-message form-message-error" role="alert">{error}</p>}
      <button className="register-button" type="submit" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
    </form>
  );
}
