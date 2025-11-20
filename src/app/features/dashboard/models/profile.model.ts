import { User } from '../../../core/models/auth.model';

/**
 * Update profile request payload
 */
export interface UpdateProfileRequest {
  full_name?: string;
  bio?: string;
}

/**
 * Change password request payload
 */
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

/**
 * Profile response from API
 */
export interface ProfileResponse {
  code: number;
  status: string;
  data: User;
}

/**
 * Profile form data
 */
export interface ProfileFormData {
  full_name: string;
  bio: string;
}

/**
 * Password form data
 */
export interface PasswordFormData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}
