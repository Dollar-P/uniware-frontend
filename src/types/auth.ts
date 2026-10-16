export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  department?: string;
}
export type RegisterFormData = RegisterRequest;
export type RegisterFormErrors = Partial<Record<keyof RegisterRequest, string>>;
export interface RegisterResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  is_admin: boolean;
  is_provider: boolean;
  is_borrower: boolean;
  account_status: 'ACTIVE' | 'SUSPENDED';
  date_joined: string;
}
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]> | string[] | null;
  };
}
export class RegistrationError extends Error {
  fields: RegisterFormErrors;
  constructor(message: string, fields: RegisterFormErrors = {}) {
    super(message);
    this.name = 'RegistrationError';
    this.fields = fields;
  }
}
