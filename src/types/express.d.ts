import { Role } from '../generated/prisma/enums';

declare module 'cors';

export interface UserContext {
  id: string;
  email: string;
  organizationId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}
