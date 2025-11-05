import { Request } from 'express';

export interface RequestUser {
  id: number | string;
  email: string;
  roles?: string[];
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}
