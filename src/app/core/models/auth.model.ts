/**
 * Type definitions untuk Authentication & User
 * Sesuai dengan API specs dari backend Golang
 */

/**
 * User role types
 */
export type UserRole = 'super_admin' | 'admin' | 'user';

/**
 * User interface - struktur data user dari backend
 */
export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  bio: string;
  avatar: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Register request payload
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

/**
 * Refresh token request payload
 */
export interface RefreshTokenRequest {
  refresh_token: string;
}

/**
 * Auth response dari backend (login/register)
 */
export interface AuthResponse {
  code: number;
  status: string;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}

/**
 * Token response dari backend (refresh token)
 */
export interface TokenResponse {
  code: number;
  status: string;
  data: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  };
}

/**
 * User response dari backend (get user profile)
 */
export interface UserResponse {
  code: number;
  status: string;
  data: User;
}

/**
 * Generic API error response
 */
export interface ApiError {
  code: number;
  status: string;
  data: {
    message: string;
    errors?: Record<string, string[]>;
  };
}
