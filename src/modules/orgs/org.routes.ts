import { Router, Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { orgController } from './org.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { addMemberSchema, updateMemberRoleSchema } from './org.validation';
import { Role } from '../../generated/prisma/enums';

const validateBody = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

const router = Router();

// Protect all /organizations routes with authenticate middleware
router.use(authenticate);

// View member list and member details (accessible by all authenticated organization members)
router.get('/members', (req, res, next) => orgController.listMembers(req, res, next));
router.get('/members/:userId', (req, res, next) => orgController.getMemberById(req, res, next));

// Member administration endpoints (strictly require org_admin role)
router.post('/members', requireRole(Role.org_admin), validateBody(addMemberSchema), (req, res, next) =>
  orgController.addMember(req, res, next)
);
router.patch('/members/:userId', requireRole(Role.org_admin), validateBody(updateMemberRoleSchema), (req, res, next) =>
  orgController.updateMemberRole(req, res, next)
);
router.delete('/members/:userId', requireRole(Role.org_admin), (req, res, next) =>
  orgController.removeMember(req, res, next)
);

export const orgRoutes = router;
