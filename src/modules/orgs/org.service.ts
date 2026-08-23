import { prisma } from '../../lib/prisma';
import { Role } from '../../generated/prisma/enums';
import { hashPassword } from '../../utils/password';
import {
  MemberNotFoundError,
  CannotRemoveLastAdminError,
  ValidationError,
  ForbiddenError,
} from '../../utils/errors';
import { AddMemberDTO, UpdateMemberRoleDTO, OrgMemberResponse } from './org.types';

export class OrgService {
  async listMembers(orgId: string): Promise<OrgMemberResponse[]> {
    const members = await prisma.orgMember.findMany({
      where: {
        organization_id: orgId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            created_at: true,
          },
        },
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    return members;
  }

  async getMemberById(orgId: string, targetUserId: string): Promise<OrgMemberResponse> {
    const member = await prisma.orgMember.findFirst({
      where: {
        organization_id: orgId,
        user_id: targetUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            created_at: true,
          },
        },
      },
    });

    if (!member) {
      throw new MemberNotFoundError();
    }

    return member;
  }

  async addMember(orgId: string, dto: AddMemberDTO): Promise<OrgMemberResponse> {
    let user = await prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      const name = dto.name || dto.email.split('@')[0];
      const password = dto.password || 'TemporaryPass123!';
      const password_hash = await hashPassword(password);

      user = await prisma.user.create({
        data: {
          email: dto.email,
          name,
          password_hash,
        },
      });
    }

    const existingMembership = await prisma.orgMember.findFirst({
      where: {
        organization_id: orgId,
        user_id: user.id,
      },
    });

    if (existingMembership) {
      throw new ValidationError('User is already a member of this organization');
    }

    const newMember = await prisma.orgMember.create({
      data: {
        organization_id: orgId,
        user_id: user.id,
        role: dto.role || Role.member,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            created_at: true,
          },
        },
      },
    });

    return newMember;
  }

  async updateMemberRole(
    orgId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDTO
  ): Promise<OrgMemberResponse> {
    const member = await prisma.orgMember.findFirst({
      where: {
        organization_id: orgId,
        user_id: targetUserId,
      },
    });

    if (!member) {
      throw new MemberNotFoundError();
    }

    // Safety Check: If demoting an org_admin to member, ensure there is at least 1 other org_admin remaining
    if (member.role === Role.org_admin && dto.role !== Role.org_admin) {
      const adminCount = await prisma.orgMember.count({
        where: {
          organization_id: orgId,
          role: Role.org_admin,
        },
      });

      if (adminCount <= 1) {
        throw new CannotRemoveLastAdminError();
      }
    }

    const updatedMember = await prisma.orgMember.update({
      where: {
        id: member.id,
      },
      data: {
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            created_at: true,
          },
        },
      },
    });

    return updatedMember;
  }

  async removeMember(orgId: string, targetUserId: string): Promise<void> {
    const member = await prisma.orgMember.findFirst({
      where: {
        organization_id: orgId,
        user_id: targetUserId,
      },
    });

    if (!member) {
      throw new MemberNotFoundError();
    }

    // Safety Check: Cannot remove the last org_admin of the organization
    if (member.role === Role.org_admin) {
      const adminCount = await prisma.orgMember.count({
        where: {
          organization_id: orgId,
          role: Role.org_admin,
        },
      });

      if (adminCount <= 1) {
        throw new CannotRemoveLastAdminError();
      }
    }

    await prisma.orgMember.delete({
      where: {
        id: member.id,
      },
    });
  }
}

export const orgService = new OrgService();
