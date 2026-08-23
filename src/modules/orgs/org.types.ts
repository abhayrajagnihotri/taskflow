import { Role } from '../../generated/prisma/enums';

export interface AddMemberDTO {
  email: string;
  role?: Role;
  name?: string;
  password?: string;
}

export interface UpdateMemberRoleDTO {
  role: Role;
}

export interface OrgMemberResponse {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  created_at: Date;
  user: {
    id: string;
    name: string;
    email: string;
    created_at: Date;
  };
}
