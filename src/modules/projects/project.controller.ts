import { Request, Response, NextFunction } from 'express';
import { projectService } from './project.service';
import { taskService } from '../tasks/task.service';

export class ProjectController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const result = await projectService.createProject(orgId, req.body);
      res.status(201).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const result = await projectService.listProjects(orgId, req.query.page, req.query.limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const projectId = req.params.id as string;
      const result = await projectService.getProjectById(orgId, projectId);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const projectId = req.params.id as string;
      const result = await projectService.updateProject(orgId, projectId, req.body);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const projectId = req.params.id as string;
      await projectService.deleteProject(orgId, projectId);
      res.status(200).json({
        message: 'Project deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const projectId = req.params.id as string;
      const counts = await taskService.getProjectDashboard(orgId, projectId);
      res.status(200).json({
        data: counts,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
