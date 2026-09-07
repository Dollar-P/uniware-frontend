import { useState } from 'react';
import type { FormEvent } from 'react';
import { registerUser } from '../../services/authApi';
import { validateRegistration } from '../../utils/validation';
import { RegistrationError } from '../../types/auth';
import type { RegisterFormData, RegisterFormErrors } from '../../types/auth';
const emptyForm: RegisterFormData = {
  first_name: '', last_name: '', email: '', password: '', department: '',
};
const fields = [
  { key: 'first_name', label: 'First name', type: 'text', autoComplete: 'given-name' },
  { key: 'last_name', label: 'Last name', type: 'text', autoComplete: 'family-name' },
  { key: 'email', label: 'University Email', type: 'email', autoComplete: 'email' },
  { key: 'department', label: 'Department (optional)', type: 'text', autoComplete: 'organization' },
  { key: 'password', label: 'Password', type: 'password', autoComplete: 'new-password' },
] as const;
function RegisterForm() {
  const [form, setForm] = useState<RegisterFormData>(emptyForm);
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [apiError, setApiError] = useState('');
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setSuccessMessage('');
    setApiError('');
    const data = { ...form, first_name: form.first_name.trim(), last_name: form.last_name.trim(),
      email: form.email.trim().toLowerCase(), department: form.department?.trim() ?? '' };
    const validationErrors = validateRegistration(data);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    try {
      setIsLoading(true);
      await registerUser(data);
      setSuccessMessage('Registration successful');
      setForm(emptyForm);
    } catch (error) {
      if (error instanceof RegistrationError) setErrors(error.fields);
      setApiError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <form className="register-form" onSubmit={handleSubmit} noValidate>
      {fields.map(({ key, label, type, autoComplete }) => (
        <div className="form-field" key={key}>
          <label htmlFor={key}>{label}</label>
          <input id={key} name={key} type={type} autoComplete={autoComplete}
            required={key !== 'department'} disabled={isLoading} value={form[key]}
            aria-invalid={Boolean(errors[key])}
            aria-describedby={[errors[key] ? `${key}-error` : '', key === 'password' ? 'password-help' : ''].filter(Boolean).join(' ') || undefined}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
          {key === 'password' && (
            <p className="form-help" id="password-help">
              At least 10 characters. Avoid common passwords, entirely numeric passwords,
              and passwords similar to your name or email.
            </p>
          )}
          {errors[key] && <p className="form-error" id={`${key}-error`}>{errors[key]}</p>}
        </div>
      ))}
      {apiError && <div className="form-message form-message-error" role="alert">{apiError}</div>}
      {successMessage && <div className="form-message form-message-success" role="status">{successMessage}</div>}
      <button className="register-button" type="submit" disabled={isLoading}>
        {isLoading ? 'Signing up...' : 'Sign up'}
      </button>
    </form>
  );
}
export default RegisterForm;
