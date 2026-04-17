import { EventRepository } from '../repositories/EventRepository';
import { EventStatus } from '@prisma/client';
import { HttpError } from '../utils/httpError';
import { EventEntity } from '../models/event';
import { IEventRepository } from '../repositories/interfaces';
import { Organizer, Role } from '../models/user';

export class EventService {
  private eventRepository: IEventRepository;

  constructor(eventRepository: IEventRepository = new EventRepository()) {
    this.eventRepository = eventRepository;
  }

  async createEvent(data: any, organizerId: string) {
    const event = await this.eventRepository.create({
      ...data,
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

    const updatedEvent = await this.eventRepository.updateStatus(eventId, status);
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
