import { hashPassword, comparePassword } from '../../../src/utils/password';
import { signAccessToken, verifyAccessToken, hashToken } from '../../../src/lib/jwt';

describe('Unit Tests: Authentication & Token Utilities', () => {
  describe('Password Hashing & Comparison', () => {
    it('should hash password and return valid bcrypt hash string', async () => {
      const rawPassword = 'SecretPassword123!';
      const hash = await hashPassword(rawPassword);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toEqual(rawPassword);
      expect(hash.startsWith('$2b$') || hash.startsWith('$2a$')).toBe(true);
    });

    it('should correctly compare valid password against hash', async () => {
      const rawPassword = 'SecretPassword123!';
      const hash = await hashPassword(rawPassword);

      const isMatch = await comparePassword(rawPassword, hash);
      expect(isMatch).toBe(true);
    });

    it('should return false for invalid password comparison', async () => {
      const rawPassword = 'SecretPassword123!';
      const wrongPassword = 'WrongPassword999!';
      const hash = await hashPassword(rawPassword);

      const isMatch = await comparePassword(wrongPassword, hash);
      expect(isMatch).toBe(false);
    });
  });

  describe('JWT Access Token Signing & Verification', () => {
    it('should sign access token and verify subject payload correctly', () => {
      const userId = 'user-uuid-123';

      const token = signAccessToken(userId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyAccessToken(token);
      expect(decoded.sub).toEqual(userId);
    });

    it('should throw error when verifying invalid access token', () => {
      const invalidToken = 'invalid.jwt.token.string';
      expect(() => verifyAccessToken(invalidToken)).toThrow();
    });
  });

  describe('Refresh Token Hashing', () => {
    it('should produce SHA-256 hash string for refresh token', () => {
      const token = 'sample-refresh-token-uuid';
      const hash = hashToken(token);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).toHaveLength(64); // SHA-256 hex length
    });

    it('should produce deterministic hash for identical input token', () => {
      const token = 'sample-refresh-token-uuid';
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);

      expect(hash1).toEqual(hash2);
    });
  });
});
