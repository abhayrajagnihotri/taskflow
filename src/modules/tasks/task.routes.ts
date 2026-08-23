import { Router, Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { taskController } from './task.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { updateTaskSchema, assignUserSchema } from './task.validation';

const validateBody = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

const router = Router();

// Protect all /tasks endpoints with authenticate middleware
router.use(authenticate);

// Task CRUD Endpoints
router.get('/:id', (req, res, next) => taskController.getTaskById(req, res, next));
router.patch('/:id', validateBody(updateTaskSchema), (req, res, next) => taskController.updateTask(req, res, next));
router.delete('/:id', (req, res, next) => taskController.deleteTask(req, res, next));

// Task Assignment Endpoints
router.post('/:id/assignments', validateBody(assignUserSchema), (req, res, next) => taskController.assignUser(req, res, next));
router.delete('/:id/assignments/:userId', (req, res, next) => taskController.unassignUser(req, res, next));

export const taskRoutes = router;
