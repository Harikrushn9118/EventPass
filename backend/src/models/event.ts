import { EventStatus } from '@prisma/client';

export interface EventRecord {
  id: string;
  title: string;
  description: string;
  date: Date;
  venue: string;
  maxCapacity: number;
  status: EventStatus;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    registrations: number;
  };
}

export class EventEntity {
  constructor(private readonly event: EventRecord) {}

  get id() {
    return this.event.id;
  }

  get organizerId() {
    return this.event.organizerId;
  }

  get status() {
    return this.event.status;
  }

  get maxCapacity() {
    return this.event.maxCapacity;
  }

  get registrationCount() {
    return this.event._count?.registrations ?? 0;
  }

  isFull() {
    return this.registrationCount >= this.maxCapacity;
  }

  isRegistrationOpen() {
    return this.status === EventStatus.UPCOMING;
  }

  getAvailableSeats() {
    return Math.max(this.maxCapacity - this.registrationCount, 0);
  }

  toJSON() {
    return {
      ...this.event,
      availableSeats: this.getAvailableSeats(),
      isFull: this.isFull(),
      isRegistrationOpen: this.isRegistrationOpen(),
    };
  }
}
