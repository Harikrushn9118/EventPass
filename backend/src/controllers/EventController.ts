import { Response } from 'express';
import { EventService } from '../services/EventService';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';

const eventService = new EventService();

export const createEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await eventService.createEvent(req.body, req.user!.id);
  res.status(201).json({ success: true, data: result });
});

export const getEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await eventService.getAllEvents();
  res.status(200).json({ success: true, data: result });
});
