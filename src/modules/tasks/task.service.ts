import { prisma } from '../../lib/prisma';
import { Status, Priority } from '../../generated/prisma/enums';
import { getPaginationParams, PaginatedResult } from '../../utils/pagination';
import { emailQueue, EmailJobPayload } from '../../queues/email.queue';
import {
  ProjectNotFoundError,
  TaskNotFoundError,
  ForbiddenError,
  DuplicateAssignmentError,
  AssignmentNotFoundError,
  AppError,
} from '../../utils/errors';
import {
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskFilterQuery,
  TaskDashboardResponse,
  TaskResponse,
} from './task.types';

export class TaskService {
  async createTask(orgId: string, projectId: string, dto: CreateTaskDTO): Promise<TaskResponse> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.deleted_at !== null) {
      throw new ProjectNotFoundError();
    }

    if (project.organization_id !== orgId) {
      throw new ForbiddenError();
    }

    const task = await prisma.task.create({
      data: {
        project_id: projectId,
        title: dto.title,
        description: dto.description || null,
        status: dto.status || Status.todo,
        priority: dto.priority || Priority.medium,
        due_date: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });

    return task;
  }

  async listTasks(orgId: string, projectId: string, queryFilters: TaskFilterQuery): Promise<PaginatedResult<TaskResponse>> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.deleted_at !== null) {
      throw new ProjectNotFoundError();
    }

    if (project.organization_id !== orgId) {
      throw new ForbiddenError();
    }

    const { page, limit, skip } = getPaginationParams(queryFilters.page, queryFilters.limit);

    const whereClause: any = {
      project_id: projectId,
      deleted_at: null,
    };

    if (queryFilters.status) {
      whereClause.status = queryFilters.status;
    }

    if (queryFilters.priority) {
      whereClause.priority = queryFilters.priority;
    }

    if (queryFilters.assigneeId) {
      whereClause.assignments = {
        some: {
          user_id: queryFilters.assigneeId,
        },
      };
    }

    if (queryFilters.dueFrom || queryFilters.dueTo) {
      whereClause.due_date = {};
      if (queryFilters.dueFrom) {
        whereClause.due_date.gte = new Date(queryFilters.dueFrom);
      }
      if (queryFilters.dueTo) {
        whereClause.due_date.lte = new Date(queryFilters.dueTo);
      }
    }

    const [total, tasks] = await prisma.$transaction([
      prisma.task.count({ where: whereClause }),
      prisma.task.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    return {
      data: tasks,
      total,
      page,
      limit,
    };
  }

  async getTaskById(orgId: string, taskId: string): Promise<TaskResponse> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.deleted_at !== null) {
      throw new TaskNotFoundError();
    }

    if (task.project.organization_id !== orgId) {
      throw new ForbiddenError();
    }

    const { project, ...taskData } = task;
    return taskData;
  }

  async updateTask(orgId: string, taskId: string, dto: UpdateTaskDTO): Promise<TaskResponse> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.deleted_at !== null) {
      throw new TaskNotFoundError();
    }

    if (task.project.organization_id !== orgId) {
      throw new ForbiddenError();
    }

    let dueDateUpdate: Date | null | undefined = undefined;
    if (dto.dueDate !== undefined) {
      dueDateUpdate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dueDateUpdate !== undefined && { due_date: dueDateUpdate }),
      },
    });

    return updatedTask;
  }

  async deleteTask(orgId: string, taskId: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.deleted_at !== null) {
      throw new TaskNotFoundError();
    }

    if (task.project.organization_id !== orgId) {
      throw new ForbiddenError();
    }

    await prisma.task.delete({
      where: { id: taskId },
    });
  }

  async assignTaskUser(
    orgId: string,
    taskId: string,
    userId: string,
    assignedByUserId?: string,
    simulateQueueFailure: boolean = false
  ): Promise<{ jobId: string }> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.deleted_at !== null) {
      throw new TaskNotFoundError();
    }

    if (task.project.organization_id !== orgId) {
      throw new ForbiddenError();
    }

    // Ensure target user belongs to the same organization and retrieve user profile details
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        org_members: {
          some: {
            organization_id: orgId,
          },
        },
      },
    });

    if (!targetUser) {
      throw new ForbiddenError('Target user does not belong to the organization');
    }

    // Check duplicate assignment
    const existingAssignment = await prisma.taskAssignment.findUnique({
      where: {
        task_id_user_id: {
          task_id: taskId,
          user_id: userId,
        },
      },
    });

    if (existingAssignment) {
      throw new DuplicateAssignmentError();
    }

    // 1. Create task assignment record in PostgreSQL
    const assignment = await prisma.taskAssignment.create({
      data: {
        task_id: taskId,
        user_id: userId,
      },
    });

    const jobId = `job-${assignment.id}`;
    const jobPayload: EmailJobPayload = {
      taskId: task.id,
      taskTitle: task.title,
      assignedUserId: targetUser.id,
      assignedUserEmail: targetUser.email,
      assignedUserName: targetUser.name,
      assignedByUserId: assignedByUserId || targetUser.id,
      organizationId: orgId,
      ...(simulateQueueFailure && { simulateFailure: true }),
    };

    // 2. Enqueue notification job to BullMQ queue with compensating transaction protection
    try {
      if (simulateQueueFailure) {
        throw new Error('Simulated Redis/BullMQ connection failure during enqueue');
      }

      await emailQueue.add(`notify-${task.id}`, jobPayload, {
        jobId,
      });
    } catch (queueError: any) {
      console.error(`❌ Queue enqueueing failed for assignment ${assignment.id}. Executing compensating rollback...`);
      // Compensating Transaction: Delete newly created assignment record to prevent inconsistent state
      await prisma.taskAssignment.delete({
        where: { id: assignment.id },
      });

      throw new AppError(
        'Failed to queue notification job. Task assignment rolled back for data consistency.',
        500,
        'QUEUE_ENQUEUE_FAILED',
        { originalError: queueError.message }
      );
    }

    return { jobId };
  }

  async unassignTaskUser(orgId: string, taskId: string, userId: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task || task.deleted_at !== null) {
      throw new TaskNotFoundError();
    }

    if (task.project.organization_id !== orgId) {
      throw new ForbiddenError();
    }

    const orgMember = await prisma.orgMember.findFirst({
      where: {
        organization_id: orgId,
        user_id: userId,
      },
    });

    if (!orgMember) {
      throw new ForbiddenError('Target user does not belong to the organization');
    }

    const existingAssignment = await prisma.taskAssignment.findUnique({
      where: {
        task_id_user_id: {
          task_id: taskId,
          user_id: userId,
        },
      },
    });

    if (!existingAssignment) {
      throw new AssignmentNotFoundError();
    }

    await prisma.taskAssignment.delete({
      where: {
        id: existingAssignment.id,
      },
    });
  }

  async getProjectDashboard(orgId: string, projectId: string): Promise<TaskDashboardResponse> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.deleted_at !== null) {
      throw new ProjectNotFoundError();
    }

    if (project.organization_id !== orgId) {
      throw new ForbiddenError();
    }

    const statusCounts = await prisma.task.groupBy({
      by: ['status'],
      where: {
        project_id: projectId,
        deleted_at: null,
      },
      _count: {
        id: true,
      },
    });

    const result: TaskDashboardResponse = {
      todo: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };

    statusCounts.forEach((group) => {
      if (group.status in result) {
        result[group.status as keyof TaskDashboardResponse] = group._count.id;
      }
    });

    return result;
  }
}

export const taskService = new TaskService();
