import { prisma } from '../../lib/prisma';
import { CreateProjectDTO, UpdateProjectDTO, ProjectResponse } from './project.types';
import { getPaginationParams, PaginatedResult } from '../../utils/pagination';
import { ProjectNotFoundError, ForbiddenError } from '../../utils/errors';

export class ProjectService {
  async createProject(orgId: string, dto: CreateProjectDTO): Promise<ProjectResponse> {
    const project = await prisma.project.create({
      data: {
        organization_id: orgId,
        name: dto.name,
        description: dto.description || null,
      },
    });

    return project;
  }

  async listProjects(orgId: string, rawPage?: any, rawLimit?: any): Promise<PaginatedResult<ProjectResponse>> {
    const { page, limit, skip } = getPaginationParams(rawPage, rawLimit);

    const [total, projects] = await prisma.$transaction([
      prisma.project.count({
        where: {
          organization_id: orgId,
          deleted_at: null,
        },
      }),
      prisma.project.findMany({
        where: {
          organization_id: orgId,
          deleted_at: null,
        },
        skip,
        take: limit,
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    return {
      data: projects,
      total,
      page,
      limit,
    };
  }

  async getProjectById(orgId: string, projectId: string): Promise<ProjectResponse> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.deleted_at !== null) {
      throw new ProjectNotFoundError();
    }

    if (project.organization_id !== orgId) {
      throw new ForbiddenError();
    }

    return project;
  }

  async updateProject(orgId: string, projectId: string, dto: UpdateProjectDTO): Promise<ProjectResponse> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.deleted_at !== null) {
      throw new ProjectNotFoundError();
    }

    if (project.organization_id !== orgId) {
      throw new ForbiddenError();
    }

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return updatedProject;
  }

  async deleteProject(orgId: string, projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.deleted_at !== null) {
      throw new ProjectNotFoundError();
    }

    if (project.organization_id !== orgId) {
      throw new ForbiddenError();
    }

    // Cascade deletion of projects and associated tasks
    await prisma.project.delete({
      where: { id: projectId },
    });
  }
}

export const projectService = new ProjectService();
