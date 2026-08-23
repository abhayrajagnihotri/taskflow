import { Router } from 'express';
import { jobController } from './job.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Protect all /jobs routes with authenticate middleware
router.use(authenticate);

router.get('/:id', (req, res, next) => jobController.getJobById(req, res, next));

export const jobRoutes = router;
