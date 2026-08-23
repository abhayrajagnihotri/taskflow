import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { InvalidTokenError } from '../utils/errors';

export interface AccessTokenPayload {
  sub: string;
}

export const signAccessToken = (userId: string): string => {
  const payload: AccessTokenPayload = { sub: userId };
  const options: SignOptions = {
    expiresIn: env.ACCESS_TOKEN_TTL as any,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET as Secret, options);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET as Secret) as AccessTokenPayload;
  } catch (error) {
    throw new InvalidTokenError('Invalid or expired access token');
  }
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(40).toString('hex');
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const calculateRefreshTokenExpiry = (): Date => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days TTL
  return expiresAt;
};
