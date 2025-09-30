export interface User {
  id: string;
  email: string;
  password_hash: string;
  organization_name: string;
  certificate_count: number;
  is_premium: boolean;
  created_at: Date;
  last_login?: Date;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  organization_name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  organization_name: string;
  certificate_count: number;
  is_premium: boolean;
}
