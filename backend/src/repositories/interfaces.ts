import { EventStatus, Registration, User } from '@prisma/client';
import { EventRecord } from '../models/event';

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: {
    name: string;
    email: string;
    password: string;
    role: User['role'];
  }): Promise<User>;
}

export interface IEventRepository {
  create(data: {
    title: string;
    description: string;
    date: Date;
    venue: string;
    maxCapacity: number;
    organizerId: string;
  }): Promise<EventRecord>;
  findAll(): Promise<EventRecord[]>;
  findById(eventId: string): Promise<EventRecord | null>;
  updateStatus(eventId: string, status: EventStatus): Promise<EventRecord>;
  findByOrganizerId(organizerId: string): Promise<EventRecord[]>;
  findRegistrationsForEvent(eventId: string): Promise<Array<Registration & { user: Pick<User, 'id' | 'name' | 'email'> }>>;
}

export interface IRegistrationRepository {
  createRegistration(userId: string, eventId: string, ticketUUID: string): Promise<Registration>;
  findRegistrationByUUID(ticketUUID: string): Promise<(Registration & { event: EventRecord; user: User }) | null>;
  markAsAttended(ticketUUID: string): Promise<Registration>;
  findUserRegistrations(userId: string): Promise<Array<Registration & { event: EventRecord }>>;
}
