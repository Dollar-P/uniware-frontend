import type { RegisterResponse } from './auth';

export type Profile = RegisterResponse;
export const EDITABLE_PROFILE_FIELDS = ['first_name', 'last_name', 'department'] as const;
export type ProfileUpdate = Pick<Profile, typeof EDITABLE_PROFILE_FIELDS[number]>;
export type ProfileErrors = Partial<Record<keyof ProfileUpdate, string>>;

export class ProfileError extends Error {
  fields: ProfileErrors;
  status: number;
  constructor(message: string, status: number, fields: ProfileErrors = {}) {
    super(message);
    this.name = 'ProfileError';
    this.status = status;
    this.fields = fields;
  }
}

export function validateProfile(data: ProfileUpdate): ProfileErrors {
  const errors: ProfileErrors = {};
  const forbidden = /[0-9`~!@#$%^&*()_+=[\]{}|\\;:"<>/?]/;
  for (const key of ['first_name', 'last_name'] as const) {
    const name = data[key].trim();
    if (!name) errors[key] = 'This name is required.';
    else if (name.length > 150) errors[key] = 'Use at most 150 characters.';
    else if (forbidden.test(name)) errors[key] = 'Name contains characters that are not allowed.';
  }
  if (data.department.trim().length > 255) errors.department = 'Use at most 255 characters.';
  return errors;
}
