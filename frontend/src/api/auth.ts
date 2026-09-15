import { apiFetch } from './client';
import {
  LoginRequest,
  LoginResponse,
  OtpRequest,
  PasswordResetRequest,
  RegisterRequest,
  UserProfile,
} from '../types/auth';

export async function loginCustomer(payload: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function registerCustomer(payload: RegisterRequest): Promise<UserProfile> {
  return apiFetch<UserProfile>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generatePasswordOtp(payload: OtpRequest): Promise<string> {
  return apiFetch<string>('/auth/password-otp-generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resetPassword(payload: PasswordResetRequest): Promise<string> {
  return apiFetch<string>('/auth/password-reset', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logoutCustomer(): Promise<string> {
  try {
    return await apiFetch<string>('/auth/logout', {
      method: 'POST',
    });
  } finally {
    localStorage.removeItem('rlaas_token');
    localStorage.removeItem('rlaas_user');
    window.dispatchEvent(new Event('rlaas_auth_change'));
  }
}

export async function getCurrentCustomer(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/customers/me');
}
