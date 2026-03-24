import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const validateTenant = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user?.restaurantId) {
    res.status(403).json({ error: 'Tenant validation failed. No restaurant context.' });
    return;
  }
  next();
};
