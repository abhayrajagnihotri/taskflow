import { Request, Response, NextFunction } from 'express';
import { jobService } from './job.service';

export class JobController {
  async getJobById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.user!.organizationId;
      const jobId = req.params.id as string;
      const result = await jobService.getJobById(orgId, jobId);
      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const jobController = new JobController();
