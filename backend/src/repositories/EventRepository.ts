import { prisma } from '../lib/prisma';
import { IEventRepository } from './interfaces';

export class EventRepository implements IEventRepository {
  async create(data: any) {
    return await prisma.event.create({
      data,
    });
  }

  async findAll() {
    return await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(eventId: string) {
    return await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    });
  }

  async updateStatus(eventId: string, status: any) {
    return await prisma.event.update({
      where: { id: eventId },
      data: { status },
    });
  }

  async findByOrganizerId(organizerId: string) {
    return await prisma.event.findMany({
      where: { organizerId },
      orderBy: { date: 'asc' },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    });
  }

  async findRegistrationsForEvent(eventId: string) {
    return await prisma.registration.findMany({
      where: { eventId },
      orderBy: { registeredAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
