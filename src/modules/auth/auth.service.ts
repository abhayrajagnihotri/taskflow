import { prisma } from '../../lib/prisma';
import { hashPassword, comparePassword } from '../../utils/password';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  calculateRefreshTokenExpiry,
} from '../../lib/jwt';
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  RefreshTokenExpiredError,
  RefreshTokenRevokedError,
} from '../../utils/errors';
import { Role } from '../../generated/prisma/enums';
import {
  RegisterDTO,
  LoginDTO,
  RefreshDTO,
  LogoutDTO,
  RegisterResponse,
  TokenResponse,
} from './auth.types';

export class AuthService {
  async register(dto: RegisterDTO): Promise<RegisterResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new EmailAlreadyExistsError('User with this email already exists');
    }

    const password_hash = await hashPassword(dto.password);

    // Atomic transaction creating Organization, User, and OrgMember
    const result = await prisma.$transaction(async (tx: any) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
        },
      });

      const user = await tx.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password_hash,
        },
      });

      const member = await tx.orgMember.create({
        data: {
          organization_id: organization.id,
          user_id: user.id,
          role: Role.org_admin, // First user of newly created organization is org_admin
        },
      });

      return { user, organization, member };
    });

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        role: result.member.role,
      },
    };
  }

  async login(dto: LoginDTO): Promise<TokenResponse> {
    const user = await prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        org_members: {
          take: 1,
        },
      },
    });

    if (!user) {
      throw new InvalidCredentialsError();
    }

    const isPasswordValid = await comparePassword(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new InvalidCredentialsError();
    }

    if (user.org_members.length === 0) {
      throw new InvalidCredentialsError();
    }

    const accessToken = signAccessToken(user.id);
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = calculateRefreshTokenExpiry();

    await prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async refresh(dto: RefreshDTO): Promise<TokenResponse> {
    const tokenHash = hashToken(dto.refreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
    });

    if (!tokenRecord) {
      throw new InvalidRefreshTokenError('Refresh token is invalid');
    }

    if (tokenRecord.revoked_at) {
      throw new RefreshTokenRevokedError('Refresh token has been revoked');
    }

    if (tokenRecord.expires_at < new Date()) {
      throw new RefreshTokenExpiredError('Refresh token has expired');
    }

    // Refresh token rotation in transaction
    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);
    const newExpiresAt = calculateRefreshTokenExpiry();

    const newAccessToken = signAccessToken(tokenRecord.user_id);

    await prisma.$transaction([
      // Revoke old refresh token
      prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revoked_at: new Date() },
      }),
      // Create new refresh token
      prisma.refreshToken.create({
        data: {
          user_id: tokenRecord.user_id,
          token_hash: newTokenHash,
          expires_at: newExpiresAt,
        },
      }),
    ]);

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(dto: LogoutDTO): Promise<void> {
    const tokenHash = hashToken(dto.refreshToken);

    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
    });

    if (tokenRecord && !tokenRecord.revoked_at) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { revoked_at: new Date() },
      });
    }
  }
}

export const authService = new AuthService();
