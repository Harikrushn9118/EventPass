import { RegistrationRepository } from '../repositories/RegistrationRepository';
import { EventService } from '../services/EventService';
import { HttpError } from '../utils/httpError';
import { IRegistrationRepository } from '../repositories/interfaces';
import { ITicketStrategy, UUIDTicketStrategy } from '../utils/ticketStrategy';
import { EventEmitter, EventType } from '../utils/eventEmitter';

/**
 * RegistrationService handles student event registration.
 * Demonstrates:
 *   - Strategy Pattern: ticket generation strategy is injected
 *   - Observer Pattern: emits domain events on registration
 *   - Dependency Injection: repositories and strategies via constructor
 */
export class RegistrationService {
  private registrationRepository: IRegistrationRepository;
  private eventService: EventService;
  private ticketStrategy: ITicketStrategy;
  private eventEmitter: EventEmitter;

  constructor(
    registrationRepository: IRegistrationRepository = new RegistrationRepository(),
    eventService: EventService = new EventService(),
    ticketStrategy: ITicketStrategy = new UUIDTicketStrategy()
  ) {
    this.registrationRepository = registrationRepository;
    this.eventService = eventService;
    this.ticketStrategy = ticketStrategy;
    this.eventEmitter = EventEmitter.getInstance();
  }

  async registerForEvent(userId: string, eventId: string) {
    // 1. Capacity Guard — check availability and status
    const hasCapacity = await this.eventService.checkCapacity(eventId);
    if (!hasCapacity) {
      throw new HttpError('Event is fully booked', 400);
    }

    // 2. Generate ticket using the injected Strategy
    const ticketUUID = this.ticketStrategy.generate();

    // 3. Create Registration
    try {
      const registration = await this.registrationRepository.createRegistration(userId, eventId, ticketUUID);

      // 4. Emit domain event (Observer Pattern)
      this.eventEmitter.emit(EventType.REGISTRATION_CREATED, {
        userId,
        eventId,
        ticketUUID,
      });

      return registration;
    } catch (err: any) {
      if (err.code === 'P2002') { // Prisma Unique constraint failed
        throw new HttpError('Already registered for this event', 400);
      }
      throw err;
    }
  }
}
