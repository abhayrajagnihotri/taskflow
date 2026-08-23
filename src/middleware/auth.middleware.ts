import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import { AuthRequiredError, ForbiddenError, InvalidTokenError } from '../utils/errors';
import { Role } from '../generated/prisma/enums';

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthRequiredError('Authorization header missing or invalid format');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new AuthRequiredError('Access token required');
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        org_members: {
          take: 1, // Retrieve primary organization membership
        },
      },
    });

    if (!user || user.org_members.length === 0) {
      throw new InvalidTokenError('User or organization membership not found');
    }

    const primaryOrgMember = user.org_members[0];

    req.user = {
      id: user.id,
      email: user.email,
      organizationId: primaryOrgMember.organization_id,
      role: primaryOrgMember.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthRequiredError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError(`Access denied: Requires ${allowedRoles.join(' or ')} role`));
    }

    next();
  };
};
