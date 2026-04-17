import { Response } from 'express';
import { EventService } from '../services/EventService';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  validateCreateEventInput,
  validateEventId,
  validateEventStatus,
} from '../utils/validators';

const eventService = new EventService();

export const createEvent = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await eventService.createEvent(validateCreateEventInput(req.body), req.user!.id);
  res.status(201).json({ success: true, data: result });
});

export const getEvents = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await eventService.getAllEvents();
  res.status(200).json({ success: true, data: result });
});

export const getEventById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await eventService.getEventDetails(validateEventId(req.params.eventId));
  res.status(200).json({ success: true, data: result });
});

export const updateEventStatus = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await eventService.updateEventStatus(
    validateEventId(req.params.eventId),
    validateEventStatus(req.body?.status),
    req.user!.id
  );

  res.status(200).json({
    success: true,
    data: result,
    message: 'Event status updated successfully',
  });
});
