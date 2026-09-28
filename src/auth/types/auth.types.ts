import type { Role } from '../../generated/client/enums.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  phoneNumber: string | null;
  avatarUrl: string | null;
}

export interface JwtRefreshPayload {
  sub: string;
}

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken: string;
  refreshToken: string;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface LogoutAllResponse {
  success: boolean;
  message: string;
}

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
