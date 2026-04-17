import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { asyncHandler } from '../utils/asyncHandler';
import { validateLoginInput, validateRegisterInput } from '../utils/validators';

const authService = new AuthService();

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(validateRegisterInput(req.body));
  res.status(201).json({ success: true, data: result });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = validateLoginInput(req.body);
  const result = await authService.login(email, password);
  res.status(200).json({ success: true, data: result });
});
