/**
 * RegistrationEntity encapsulates check-in validation logic.
 * Demonstrates Encapsulation — the rules for ticket validation
 * are contained within the entity, not scattered across services.
 */
export interface RegistrationRecord {
  id: string;
  ticketUUID: string;
  userId: string;
  eventId: string;
  attended: boolean;
  registeredAt: Date;
  event?: {
    organizerId: string;
  };
}

export class RegistrationEntity {
  constructor(private readonly registration: RegistrationRecord) {}

  get eventId() {
    return this.registration.eventId;
  }

  get attended() {
    return this.registration.attended;
  }

  get ticketUUID() {
    return this.registration.ticketUUID;
  }

  /** Check if this ticket belongs to a specific event */
  belongsToEvent(eventId: string): boolean {
    return this.registration.eventId === eventId;
  }

  /** Verify if the organizer owns the event this ticket is for */
  canBeCheckedInBy(organizerId: string): boolean {
    return this.registration.event?.organizerId === organizerId;
  }

  /** Check if the attendee has already been checked in */
  isAlreadyAttended(): boolean {
    return this.registration.attended;
  }
}
