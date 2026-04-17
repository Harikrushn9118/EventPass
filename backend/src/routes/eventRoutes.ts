import { Router } from 'express';
import {
  createEvent,
  getEventRegistrations,
  getEventById,
  getEvents,
  getMyEvents,
  updateEventStatus,
} from '../controllers/EventController';
import { authenticate, authorizeRole } from '../middlewares/authMiddleware';
import { Role } from '../models/user';

const router = Router();

// Public browsing
router.get('/', getEvents);
router.get('/:eventId', getEventById);

router.use(authenticate);

// Organizer-only management
router.get('/my-events', authorizeRole('ORGANIZER' as Role), getMyEvents);
router.get('/:eventId/registrations', authorizeRole('ORGANIZER' as Role), getEventRegistrations);

router.post('/', authorizeRole('ORGANIZER' as Role), createEvent);
router.patch('/:eventId/status', authorizeRole('ORGANIZER' as Role), updateEventStatus);

export default router;
