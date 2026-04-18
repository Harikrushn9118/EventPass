import { Response } from 'express';
import { RegistrationService } from '../services/RegistrationService';
import { CheckinService } from '../services/CheckinService';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';
import { RegistrationRepository } from '../repositories/RegistrationRepository';
import { validateCheckInInput, validateRegistrationInput } from '../utils/validators';

const registrationService = new RegistrationService();
const checkinService = new CheckinService();
const registrationRepository = new RegistrationRepository();

export const register = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = validateRegistrationInput(req.body);
  const result = await registrationService.registerForEvent(req.user!.id, eventId);
  res.status(201).json({ success: true, data: result });
});

export const checkIn = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { ticketUUID, eventId } = validateCheckInInput(req.body);
  const result = await checkinService.verifyAndCheckIn(ticketUUID, eventId, req.user!.id);
  res.status(200).json({ success: true, data: result, message: 'Check-in successful' });
});

export const myTickets = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await registrationRepository.findUserRegistrations(req.user!.id);
  res.status(200).json({ success: true, data: result });
});
