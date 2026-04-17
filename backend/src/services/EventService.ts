import { EventRepository } from '../repositories/EventRepository';
import { EventStatus } from '@prisma/client';
import { HttpError } from '../utils/httpError';

export class EventService {
  private eventRepository: EventRepository;

  constructor() {
    this.eventRepository = new EventRepository();
  }

  async createEvent(data: any, organizerId: string) {
    return await this.eventRepository.create({
      ...data,
      organizerId,
    });
  }

  async getAllEvents() {
    return await this.eventRepository.findAll();
  }

  async getEventDetails(eventId: string) {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new HttpError('Event not found', 404);
    }
    return event;
  }

  async checkCapacity(eventId: string): Promise<boolean> {
    const event = await this.getEventDetails(eventId);
    if (event.status !== 'UPCOMING') {
      throw new HttpError('Event is not open for registration', 400);
    }
    
    const currentRegistrations = event._count.registrations;
    if (currentRegistrations >= event.maxCapacity) {
      return false; // Capacity reached
    }
    
    return true; // Seats available
  }

  async updateEventStatus(eventId: string, status: EventStatus, organizerId: string) {
    const event = await this.getEventDetails(eventId);

    if (event.organizerId !== organizerId) {
      throw new HttpError('You can only update events that you created', 403);
    }

    return this.eventRepository.updateStatus(eventId, status);
  }
}
