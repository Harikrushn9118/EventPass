import { Router } from 'express';
import { createEvent, getEvents } from '../controllers/EventController';
import { authenticate, authorizeRole } from '../middlewares/authMiddleware';
import { Role } from '../models/user';

const router = Router();

router.use(authenticate);

// Public (Authenticated users)
router.get('/', getEvents);

// Organizer specific
router.post('/', authorizeRole('ORGANIZER' as Role), createEvent);

export default router;
