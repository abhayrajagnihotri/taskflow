import { Router, Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { authController } from './auth.controller';
import { authRateLimiter } from '../../middleware/rate-limit.middleware';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from './auth.validation';

const validateBody = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

const router = Router();

// Apply rate limiter specifically to auth endpoints (10 reqs/min/IP)
router.use(authRateLimiter);

router.post('/register', validateBody(registerSchema), (req, res, next) => authController.register(req, res, next));
router.post('/login', validateBody(loginSchema), (req, res, next) => authController.login(req, res, next));
router.post('/refresh', validateBody(refreshSchema), (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', validateBody(logoutSchema), (req, res, next) => authController.logout(req, res, next));

export const authRoutes = router;
