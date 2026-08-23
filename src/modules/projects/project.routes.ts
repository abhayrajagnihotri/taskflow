import { Router, Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { projectController } from './project.controller';
import { taskController } from '../tasks/task.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { createProjectSchema, updateProjectSchema } from './project.validation';
import { createTaskSchema, taskFilterSchema } from '../tasks/task.validation';
import { Role } from '../../generated/prisma/enums';

const validateBody = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

const validateQuery = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  try {
    const parsed = schema.parse(req.query);
    Object.assign(req.query, parsed);
    next();
  } catch (error) {
    next(error);
  }
};

const router = Router();

// Protect all /projects endpoints with authenticate middleware
router.use(authenticate);

// Project Endpoints (accessible by both org_admin and member)
router.post('/', validateBody(createProjectSchema), (req, res, next) => projectController.create(req, res, next));
router.get('/', (req, res, next) => projectController.list(req, res, next));
router.get('/:id', (req, res, next) => projectController.getById(req, res, next));
router.patch('/:id', validateBody(updateProjectSchema), (req, res, next) => projectController.update(req, res, next));

// DELETE /projects/:id requires org_admin specifically
router.delete('/:id', requireRole(Role.org_admin), (req, res, next) => projectController.delete(req, res, next));

// Project Task Dashboard
router.get('/:id/dashboard', (req, res, next) => projectController.getDashboard(req, res, next));

// Nested Project Tasks Endpoints (/projects/:projectId/tasks)
router.post('/:projectId/tasks', validateBody(createTaskSchema), (req, res, next) => taskController.createTask(req, res, next));
router.get('/:projectId/tasks', validateQuery(taskFilterSchema), (req, res, next) => taskController.listTasks(req, res, next));

export const projectRoutes = router;
