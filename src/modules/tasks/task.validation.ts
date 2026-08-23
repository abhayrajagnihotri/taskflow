import { z } from 'zod';
import { Status, Priority } from '../../generated/prisma/enums';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required'),
  description: z.string().optional(),
  status: z.nativeEnum(Status).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().optional().or(z.date().optional()),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Task title cannot be empty').optional(),
  description: z.string().optional(),
  status: z.nativeEnum(Status).optional(),
  priority: z.nativeEnum(Priority).optional(),
  dueDate: z.string().datetime().nullable().optional().or(z.date().nullable().optional()),
});

export const taskFilterSchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  status: z.nativeEnum(Status).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: z.string().optional(),
  dueFrom: z.string().optional(),
  dueTo: z.string().optional(),
});

export const assignUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});
