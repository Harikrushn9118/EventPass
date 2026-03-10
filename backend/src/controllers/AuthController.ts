import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { asyncHandler } from '../utils/asyncHandler';

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;
  const result = await authService.register({ name, email, password, role });
  res.status(201).json({ success: true, data: result });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json({ success: true, data: result });
});
