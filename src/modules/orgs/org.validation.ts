import { z } from 'zod';
import { Role } from '../../generated/prisma/enums';

export const addMemberSchema = z.object({
  email: z.string().email('Valid email address is required'),
  role: z.nativeEnum(Role).optional(),
  name: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.nativeEnum(Role),
});
