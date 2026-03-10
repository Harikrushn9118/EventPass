import { PrismaClient } from '@prisma/client';
import { User, Role } from '../models/user';

const prisma = new PrismaClient();

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
