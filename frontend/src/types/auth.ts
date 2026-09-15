export interface UserProfile {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  token: string;
  customerId: string;
  email: string;
  name: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface OtpRequest {
  email: string;
}

export interface PasswordResetRequest {
  email: string;
  otp: string;
  newPassword: string;
}
