import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import openapiSpec from './docs/openapi.json';
import { authRoutes } from './modules/auth/auth.routes';
import { projectRoutes } from './modules/projects/project.routes';
import { taskRoutes } from './modules/tasks/task.routes';
import { jobRoutes } from './modules/jobs/job.routes';
import { errorHandler } from './middleware/error.middleware';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Swagger API Documentation Endpoint
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Routes
app.use('/auth', authRoutes);
app.use('/projects', projectRoutes);
app.use('/tasks', taskRoutes);
app.use('/jobs', jobRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
