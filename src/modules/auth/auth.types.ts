import { Role } from '../../generated/prisma/enums';

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
  organizationName: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RefreshDTO {
  refreshToken: string;
}

export interface LogoutDTO {
  refreshToken: string;
}

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
}

export interface AuthOrgResponse {
  id: string;
  name: string;
  role: Role;
}

export interface RegisterResponse {
  user: AuthUserResponse;
  organization: AuthOrgResponse;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
