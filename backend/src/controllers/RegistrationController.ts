import { Response } from 'express';
import { RegistrationService } from '../services/RegistrationService';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';
import { RegistrationRepository } from '../repositories/RegistrationRepository';

const registrationService = new RegistrationService();
const registrationRepository = new RegistrationRepository();

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.body;
  const result = await registrationService.registerForEvent(req.user!.id, eventId);
  res.status(201).json({ success: true, data: result });
});

export const checkIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { ticketUUID } = req.body;
  const result = await registrationService.verifyAndCheckInTicket(ticketUUID, req.user!.id);
  res.status(200).json({ success: true, data: result, message: 'Check-in successful' });
});

export const myTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await registrationRepository.findUserRegistrations(req.user!.id);
  res.status(200).json({ success: true, data: result });
});
