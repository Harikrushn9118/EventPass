import { RegistrationRepository } from '../repositories/RegistrationRepository';
import { EventService } from '../services/EventService';
import { v4 as uuidv4 } from 'uuid';
import { HttpError } from '../utils/httpError';
import { IRegistrationRepository } from '../repositories/interfaces';
import { RegistrationEntity } from '../models/registration';

export class RegistrationService {
  private registrationRepository: IRegistrationRepository;
  private eventService: EventService;

  constructor(
    registrationRepository: IRegistrationRepository = new RegistrationRepository(),
    eventService: EventService = new EventService()
  ) {
    this.registrationRepository = registrationRepository;
    this.eventService = eventService;
  }

  async registerForEvent(userId: string, eventId: string) {
    // 1. Check Capacity and Status Guard
    const hasCapacity = await this.eventService.checkCapacity(eventId);
    if (!hasCapacity) {
      throw new HttpError('Event is fully booked', 400);
    }

    // 2. Generate unique UUID based ticket
    const ticketUUID = uuidv4();

    // 3. Create Registration
    try {
      const registration = await this.registrationRepository.createRegistration(userId, eventId, ticketUUID);
      return registration;
    } catch (err: any) {
      if (err.code === 'P2002') { // Prisma Unique constraint failed
        throw new HttpError('Already registered for this event', 400);
      }
      throw err;
    }
  }

  async verifyAndCheckInTicket(ticketUUID: string, eventId: string, organizerId: string) {
    const registration = await this.registrationRepository.findRegistrationByUUID(ticketUUID);
    
    // Validate existence
    if (!registration) {
      throw new HttpError('Invalid ticket UUID', 404);
    }

    const registrationEntity = new RegistrationEntity(registration);

    if (!registrationEntity.belongsToEvent(eventId)) {
      throw new HttpError('Ticket does not belong to the selected event', 400);
    }

    // Validate if the correct organizer is checking them in
    if (!registrationEntity.canBeCheckedInBy(organizerId)) {
      throw new HttpError('Unauthorized down to event level', 403);
    }

    // Check if already attended
    if (registrationEntity.attended) {
      throw new HttpError('Ticket has already been used', 400);
    }

    // Mark as attended
    return await this.registrationRepository.markAsAttended(ticketUUID);
  }
}
