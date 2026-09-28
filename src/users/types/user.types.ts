import type { Role } from '../../generated/client/enums.js';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  phoneNumber: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileResponse {
  success: boolean;
  user: UserProfile;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface DeleteAccountResponse {
  success: boolean;
  message: string;
}
