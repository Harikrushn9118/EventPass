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

  belongsToEvent(eventId: string) {
    return this.registration.eventId === eventId;
  }

  canBeCheckedInBy(organizerId: string) {
    return this.registration.event?.organizerId === organizerId;
  }
}
