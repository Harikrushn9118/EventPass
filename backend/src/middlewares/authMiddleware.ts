import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { Role } from '../models/user';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error: any = new Error('No authentication token, access denied');
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
};

export const authorizeRole = (role: Role) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      const error: any = new Error(`Access denied. Requires ${role} role.`);
      error.statusCode = 403;
      return next(error);
    }
    next();
  };
};
