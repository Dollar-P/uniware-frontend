import type { RegisterFormData, RegisterFormErrors } from '../types/auth';
const disallowedNameCharacters = /[0-9`~!@#$%^&*()_+=[\]{}|\\;:"<>/?]/;
export function validateRegistration(data: RegisterFormData): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  for (const field of ['first_name', 'last_name'] as const) {
    const value = data[field].trim();
    const label = field === 'first_name' ? 'First name' : 'Last name';
    if (!value) errors[field] = `${label} is required`;
    else if (value.length > 150) errors[field] = `${label} must be at most 150 characters`;
    else if (disallowedNameCharacters.test(value)) errors[field] = `${label} contains characters that are not allowed`;
  }
  const email = data.email.trim().toLowerCase();
  const domain = email.split('@')[1] ?? '';
  if (!email) errors.email = 'University email is required';
  else if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.length > 254 ||
    (domain !== 'chula.ac.th' && !domain.endsWith('.chula.ac.th'))) {
    errors.email = 'Use an @chula.ac.th email or a university subdomain';
  }
  if (!data.password) errors.password = 'Password is required';
  else if (data.password.length < 10) errors.password = 'Password must be at least 10 characters';
  else if (/^\d+$/.test(data.password)) errors.password = 'Password cannot be entirely numeric';
  // Django additionally checks common passwords and similarity to user information.
  if ((data.department?.trim().length ?? 0) > 255) errors.department = 'Department must be at most 255 characters';
  return errors;
}
