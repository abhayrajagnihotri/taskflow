import { Request, Response, NextFunction } from 'express';
import { taskService } from './task.service';

export class TaskController {
  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const projectId = req.params.projectId as string;
      const result = await taskService.createTask(orgId, projectId, req.body);
      res.status(201).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const projectId = req.params.projectId as string;
      const result = await taskService.listTasks(orgId, projectId, req.query as any);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const taskId = req.params.id as string;
      const result = await taskService.getTaskById(orgId, taskId);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const taskId = req.params.id as string;
      const result = await taskService.updateTask(orgId, taskId, req.body);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const taskId = req.params.id as string;
      await taskService.deleteTask(orgId, taskId);
      res.status(200).json({
        message: 'Task deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async assignUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const assignedByUserId = req.user!.id;
      const taskId = req.params.id as string;
      const { userId } = req.body;
      const { jobId } = await taskService.assignTaskUser(orgId, taskId, userId, assignedByUserId);
      res.status(200).json({
        message: 'User assigned to task successfully',
        data: {
          jobId,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async unassignUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const taskId = req.params.id as string;
      const userId = req.params.userId as string;
      await taskService.unassignTaskUser(orgId, taskId, userId);
      res.status(200).json({
        message: 'User unassigned from task successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const taskController = new TaskController();
