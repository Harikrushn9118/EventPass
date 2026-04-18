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

/**
 * Valid transitions for event status — demonstrates encapsulated business rules.
 * This supports the Strategy-like status transition logic.
 */
const VALID_STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  UPCOMING: [EventStatus.ONGOING, EventStatus.CANCELLED],
  ONGOING: [EventStatus.COMPLETED, EventStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * EventEntity encapsulates all event-related business logic.
 * Demonstrates Encapsulation — capacity checks, registration rules,
 * and status transition validation are all internal to this class.
 */
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

  /** Capacity Guard — prevents overbooking */
  isFull(): boolean {
    return this.registrationCount >= this.maxCapacity;
  }

  /** Only UPCOMING events accept registrations */
  isRegistrationOpen(): boolean {
    return this.status === EventStatus.UPCOMING;
  }

  /** Calculate remaining seats */
  getAvailableSeats(): number {
    return Math.max(this.maxCapacity - this.registrationCount, 0);
  }

  /**
   * Validates whether a status transition is allowed.
   * Encapsulates the event lifecycle state machine:
   *   UPCOMING → ONGOING | CANCELLED
   *   ONGOING  → COMPLETED | CANCELLED
   *   COMPLETED → (terminal)
   *   CANCELLED → (terminal)
   */
  canTransitionTo(newStatus: EventStatus): boolean {
    return VALID_STATUS_TRANSITIONS[this.status]?.includes(newStatus) ?? false;
  }

  /** Returns allowed next statuses for UI display */
  getValidTransitions(): EventStatus[] {
    return VALID_STATUS_TRANSITIONS[this.status] ?? [];
  }

  /** Serialise to JSON with computed fields */
  toJSON() {
    return {
      ...this.event,
      availableSeats: this.getAvailableSeats(),
      isFull: this.isFull(),
      isRegistrationOpen: this.isRegistrationOpen(),
    };
  }
}
