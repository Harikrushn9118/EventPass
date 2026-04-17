import { prisma } from '../lib/prisma';

export class RegistrationRepository {
  async createRegistration(userId: string, eventId: string, ticketUUID: string) {
    return await prisma.registration.create({
      data: {
        userId,
        eventId,
        ticketUUID,
      },
    });
  }

  async findRegistrationByUUID(ticketUUID: string) {
    return await prisma.registration.findUnique({
      where: { ticketUUID },
      include: {
        event: true,
        user: true,
      }
    });
  }

  async markAsAttended(ticketUUID: string) {
    return await prisma.registration.update({
      where: { ticketUUID },
      data: { attended: true },
    });
  }

  async findUserRegistrations(userId: string) {
    return await prisma.registration.findMany({
      where: { userId },
      include: { event: true },
    });
  }
}
