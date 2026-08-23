import { Request, Response, NextFunction } from 'express';
import { orgService } from './org.service';

export class OrgController {
  async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const result = await orgService.listMembers(orgId);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMemberById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const targetUserId = req.params.userId as string;
      const result = await orgService.getMemberById(orgId, targetUserId);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const result = await orgService.addMember(orgId, req.body);
      res.status(201).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const targetUserId = req.params.userId as string;
      const result = await orgService.updateMemberRole(orgId, targetUserId, req.body);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const targetUserId = req.params.userId as string;
      await orgService.removeMember(orgId, targetUserId);
      res.status(200).json({
        message: 'Member removed from organization successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const orgController = new OrgController();
