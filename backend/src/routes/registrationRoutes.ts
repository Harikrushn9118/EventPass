import { Router } from 'express';
import { register, checkIn, myTickets } from '../controllers/RegistrationController';
import { authenticate, authorizeRole } from '../middlewares/authMiddleware';
import { Role } from '../models/user';

const router = Router();

router.use(authenticate);

// Students
router.post('/register', authorizeRole('STUDENT' as Role), register);
router.get('/my-tickets', authorizeRole('STUDENT' as Role), myTickets);

// Organizers
router.post('/check-in', authorizeRole('ORGANIZER' as Role), checkIn);

export default router;
