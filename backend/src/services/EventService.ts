import { EventRepository } from '../repositories/EventRepository';

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
      const error: any = new Error('Event not found');
      error.statusCode = 404;
      throw error;
    }
    return event;
  }

  async checkCapacity(eventId: string): Promise<boolean> {
    const event = await this.getEventDetails(eventId);
    if (event.status !== 'UPCOMING') {
      const error: any = new Error('Event is not open for registration');
      error.statusCode = 400;
      throw error;
    }
    
    const currentRegistrations = event._count.registrations;
    if (currentRegistrations >= event.maxCapacity) {
      return false; // Capacity reached
    }
    
    return true; // Seats available
  }
}
