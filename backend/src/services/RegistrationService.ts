import { RegistrationRepository } from '../repositories/RegistrationRepository';
import { EventService } from '../services/EventService';
import { v4 as uuidv4 } from 'uuid';

export class RegistrationService {
  private registrationRepository: RegistrationRepository;
  private eventService: EventService;

  constructor() {
    this.registrationRepository = new RegistrationRepository();
    this.eventService = new EventService();
  }

  async registerForEvent(userId: string, eventId: string) {
    // 1. Check Capacity and Status Guard
    const hasCapacity = await this.eventService.checkCapacity(eventId);
    if (!hasCapacity) {
      const error: any = new Error('Event is fully booked');
      error.statusCode = 400;
      throw error;
    }

    // 2. Generate unique UUID based ticket
    const ticketUUID = uuidv4();

    // 3. Create Registration
    try {
      const registration = await this.registrationRepository.createRegistration(userId, eventId, ticketUUID);
      return registration;
    } catch (err: any) {
      if (err.code === 'P2002') { // Prisma Unique constraint failed
        const error: any = new Error('Already registered for this event');
        error.statusCode = 400;
        throw error;
      }
      throw err;
    }
  }

  async verifyAndCheckInTicket(ticketUUID: string, organizerId: string) {
    const registration = await this.registrationRepository.findRegistrationByUUID(ticketUUID);
    
    // Validate existence
    if (!registration) {
      const error: any = new Error('Invalid ticket UUID');
      error.statusCode = 404;
      throw error;
    }

    // Validate if the correct organizer is checking them in
    if (registration.event.organizerId !== organizerId) {
      const error: any = new Error('Unauthorized down to event level');
      error.statusCode = 403;
      throw error;
    }

    // Check if already attended
    if (registration.attended) {
      const error: any = new Error('Ticket has already been used');
      error.statusCode = 400;
      throw error;
    }

    // Mark as attended
    return await this.registrationRepository.markAsAttended(ticketUUID);
  }
}
