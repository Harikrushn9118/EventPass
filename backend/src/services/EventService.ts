import { EventRepository } from '../repositories/EventRepository';
import { EventStatus } from '@prisma/client';
import { HttpError } from '../utils/httpError';
import { EventEntity } from '../models/event';
import { IEventRepository } from '../repositories/interfaces';
import { Organizer, Role } from '../models/user';
import { EventEmitter, EventType } from '../utils/eventEmitter';

/**
 * EventService contains all event-related business logic.
 * Uses the EventEntity for domain rules (capacity, status transitions)
 * and emits domain events via the Observer Pattern.
 */
export class EventService {
  private eventRepository: IEventRepository;
  private eventEmitter: EventEmitter;

  constructor(eventRepository: IEventRepository = new EventRepository()) {
    this.eventRepository = eventRepository;
    this.eventEmitter = EventEmitter.getInstance();
  }

  async createEvent(data: any, organizerId: string) {
    const event = await this.eventRepository.create({
      ...data,
      organizerId,
    });

    // Emit domain event (Observer Pattern)
    this.eventEmitter.emit(EventType.EVENT_CREATED, {
      eventId: event.id,
      title: event.title,
      organizerId,
    });

    return new EventEntity(event).toJSON();
  }

  async getAllEvents() {
    const events = await this.eventRepository.findAll();
    return events.map((event) => new EventEntity(event).toJSON());
  }

  async getEventDetails(eventId: string) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new HttpError('Event not found', 404);
    }
    return new EventEntity(event).toJSON();
  }

  async checkCapacity(eventId: string): Promise<boolean> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new HttpError('Event not found', 404);
    }

    const eventEntity = new EventEntity(event);
    if (!eventEntity.isRegistrationOpen()) {
      throw new HttpError('Event is not open for registration', 400);
    }

    return !eventEntity.isFull();
  }

  async updateEventStatus(eventId: string, status: EventStatus, organizerId: string) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new HttpError('Event not found', 404);
    }

    // Ownership check using Organizer entity (Polymorphism)
    const organizer = new Organizer({
      id: organizerId,
      name: '',
      email: '',
      role: Role.ORGANIZER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!organizer.ownsEvent(event.organizerId)) {
      throw new HttpError('You can only update events that you created', 403);
    }

    // Status transition validation using EventEntity (Encapsulation)
    const eventEntity = new EventEntity(event);
    if (!eventEntity.canTransitionTo(status)) {
      const validOnes = eventEntity.getValidTransitions().join(', ');
      throw new HttpError(
        `Cannot transition from ${event.status} to ${status}. Valid transitions: ${validOnes || 'none (terminal state)'}`,
        400
      );
    }

    const oldStatus = event.status;
    const updatedEvent = await this.eventRepository.updateStatus(eventId, status);

    // Emit domain event (Observer Pattern)
    this.eventEmitter.emit(EventType.EVENT_STATUS_CHANGED, {
      eventId,
      oldStatus,
      newStatus: status,
      organizerId,
    });

    return new EventEntity(updatedEvent).toJSON();
  }

  async getOrganizerEvents(organizerId: string) {
    const events = await this.eventRepository.findByOrganizerId(organizerId);
    return events.map((event) => new EventEntity(event).toJSON());
  }

  async getEventRegistrations(eventId: string, organizerId: string) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new HttpError('Event not found', 404);
    }

    if (event.organizerId !== organizerId) {
      throw new HttpError('You can only view registrations for your own events', 403);
    }

    return this.eventRepository.findRegistrationsForEvent(eventId);
  }
}
