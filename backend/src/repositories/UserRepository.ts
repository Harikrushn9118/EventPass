import { User, Role } from '../models/user';
import { prisma } from '../lib/prisma';

export class UserRepository {
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

  async create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
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
