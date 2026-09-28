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

export interface SessionMetadata {
  userAgent?: string;
  ipAddress?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
}
