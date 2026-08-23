import { Status, Priority } from '../../generated/prisma/enums';

export interface CreateTaskDTO {
  title: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  dueDate?: string | Date;
}

export interface UpdateTaskDTO {
  title?: string;
  description?: string;
  status?: Status;
  priority?: Priority;
  dueDate?: string | Date | null;
}

export interface TaskFilterQuery {
  page?: string;
  limit?: string;
  status?: Status;
  priority?: Priority;
  assigneeId?: string;
  dueFrom?: string;
  dueTo?: string;
}

export interface TaskAssignmentDTO {
  userId: string;
}

export interface TaskDashboardResponse {
  todo: number;
  in_progress: number;
  review: number;
  done: number;
}

export interface TaskResponse {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}
