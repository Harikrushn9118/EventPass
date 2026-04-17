import { IUserRepository } from './interfaces';
import { prisma } from '../lib/prisma';

export class UserRepository implements IUserRepository {
  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  async create(user: { name: string; email: string; password: string; role: 'STUDENT' | 'ORGANIZER' }) {
    return await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: user.password!,
        role: user.role,
      },
    });
  }
}
