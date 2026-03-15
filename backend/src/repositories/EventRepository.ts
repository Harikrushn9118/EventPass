import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EventRepository {
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
}
