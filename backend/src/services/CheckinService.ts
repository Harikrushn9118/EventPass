import { RegistrationRepository } from '../repositories/RegistrationRepository';
import { HttpError } from '../utils/httpError';
import { IRegistrationRepository } from '../repositories/interfaces';
import { RegistrationEntity } from '../models/registration';
import { EventEmitter, EventType } from '../utils/eventEmitter';

/**
 * CheckinService handles ticket verification and entry validation.
 * Separated from RegistrationService to match the class diagram
 * and follow Single Responsibility Principle.
 */
export class CheckinService {
  private registrationRepository: IRegistrationRepository;
  private eventEmitter: EventEmitter;

  constructor(
    registrationRepository: IRegistrationRepository = new RegistrationRepository(),
  ) {
    this.registrationRepository = registrationRepository;
    this.eventEmitter = EventEmitter.getInstance();
  }

  /**
   * Verify and check in a ticket.
   * Validates: existence → event match → organizer ownership → attendance status
   */
  async verifyAndCheckIn(ticketUUID: string, eventId: string, organizerId: string) {
    const registration = await this.registrationRepository.findRegistrationByUUID(ticketUUID);

    // Validate existence
    if (!registration) {
      throw new HttpError('Invalid ticket UUID', 404);
    }

    const registrationEntity = new RegistrationEntity(registration);

    // Validate event match
    if (!registrationEntity.belongsToEvent(eventId)) {
      throw new HttpError('Ticket does not belong to the selected event', 400);
    }

    // Validate organizer ownership
    if (!registrationEntity.canBeCheckedInBy(organizerId)) {
      throw new HttpError('You can only check in attendees for your own events', 403);
    }

    // Validate not already checked in
    if (registrationEntity.isAlreadyAttended()) {
      throw new HttpError('Ticket has already been used', 400);
    }

    // Mark as attended
    const result = await this.registrationRepository.markAsAttended(ticketUUID);

    // Emit domain event (Observer Pattern)
    this.eventEmitter.emit(EventType.CHECK_IN_COMPLETED, {
      ticketUUID,
      eventId,
      organizerId,
      userId: registration.userId,
    });

    return result;
  }
}
