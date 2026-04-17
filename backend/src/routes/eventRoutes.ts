import { Router } from 'express';
import {
  createEvent,
  getEventById,
  getEvents,
  updateEventStatus,
} from '../controllers/EventController';
import { authenticate, authorizeRole } from '../middlewares/authMiddleware';
import { Role } from '../models/user';

const router = Router();

router.use(authenticate);

// Public (Authenticated users)
router.get('/', getEvents);
router.get('/:eventId', getEventById);

// Organizer specific
router.post('/', authorizeRole('ORGANIZER' as Role), createEvent);
router.patch('/:eventId/status', authorizeRole('ORGANIZER' as Role), updateEventStatus);

export default router;
